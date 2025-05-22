import { EnrollmentDoc, Enrollments, LessonProgress } from "../models/enrollmentModel";
import { BaseRepository } from "./baseRepository";
import { IEnrollmentRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";
import { IRedisService } from "../interfaces/IServices";

export class EnrollmentRepository extends BaseRepository<EnrollmentDoc> implements IEnrollmentRepository {
  private redisService: IRedisService;

  constructor(redisService: IRedisService) {
    super(Enrollments);
    this.redisService = redisService;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    search?: string
  ): Promise<{ enrollments: EnrollmentDoc[]; total: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    let enrollments;
    let total;

    if (search && search.trim() !== '') {
      const aggregateQuery = [
        { $match: { userId: new Types.ObjectId(userId) } },

        {
          $lookup: {
            from: 'courses', 
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseData'
          }
        },
        { $unwind: '$courseData' },

        {
          $match: {
            'courseData.title': { $regex: search, $options: 'i' }
          }
        },

        { $skip: (page - 1) * limit },
        { $limit: limit },

        {
          $addFields: {
            courseId: '$courseData'
          }
        },

        {
          $project: {
            courseData: 0
          }
        }
      ];

      // Execute the aggregation
      enrollments = await this._model.aggregate(aggregateQuery);

      // Get count for pagination
      const countQuery = [
        { $match: { userId: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseData'
          }
        },
        { $unwind: '$courseData' },
        {
          $match: {
            'courseData.title': { $regex: search, $options: 'i' }
          }
        },
        { $count: 'total' }
      ];

      const countResult = await this._model.aggregate(countQuery);
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      // Standard query without search
      enrollments = await this._model
        .find(query)
        .sort({ enrolledAt: -1 })
        .populate('courseId')
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      total = await this._model.countDocuments(query).exec();
    }

    return { enrollments, total };
  }

  async findByCourseId(courseId: string): Promise<EnrollmentDoc[]> {
    return this.findAll({ courseId: new Types.ObjectId(courseId) }, 0, { enrolledAt: -1 });
  }

  async findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentDoc | null> {
    return this.findByQuery({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
  }

  async createEnrollment(enrollmentData: Partial<EnrollmentDoc>): Promise<EnrollmentDoc> {
    return this.create(enrollmentData);
  }

  async updateCompletionStatus(
    enrollmentId: string,
    status: EnrollmentDoc["completionStatus"]
  ): Promise<EnrollmentDoc | null> {
    return this.update({ _id: enrollmentId }, { completionStatus: status }, { new: true });
  }

  async updateLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    progress: number
  ): Promise<EnrollmentDoc | null> {
    const enrollment = await this.findByUserAndCourse(userId, courseId);
    if (!enrollment) return null;

    const lessonProgress = enrollment.lessonProgress.find(
      (lp) => lp.lessonId.toString() === lessonId
    );

    const newProgress = Math.min(progress, 100);
    const updatedProgress = {
      lessonId: new Types.ObjectId(lessonId),
      progress: newProgress,
      isCompleted: newProgress >= 100,
      lastWatched: new Date(),
    };

    if (lessonProgress) {
      if (newProgress > lessonProgress.progress) {
        lessonProgress.progress = newProgress;
        lessonProgress.isCompleted = newProgress >= 100 || lessonProgress.isCompleted;
      }
      lessonProgress.lastWatched = updatedProgress.lastWatched;
    } else {
      enrollment.lessonProgress.push(updatedProgress);
    }

    const updatedEnrollment = await enrollment.save();

    await this.redisService.setProgress(userId, courseId, enrollment.lessonProgress);

    return updatedEnrollment;
  }


  async getLessonProgress(userId: string, courseId: string): Promise<LessonProgress[]> {
    const cachedProgress = await this.redisService.getProgress(userId, courseId);
    if (cachedProgress) {
      return cachedProgress;
    }

    const enrollment = await this.findByUserAndCourse(userId, courseId);
    const progress = enrollment?.lessonProgress || [];
    await this.redisService.setProgress(userId, courseId, progress);
    return progress;
  }

  async updateEnrollmentStatus(userId: string, courseId: string, status: "enrolled" | "in-progress" | "completed"): Promise<EnrollmentDoc | null> {
    return this._model
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          courseId: new Types.ObjectId(courseId),
        },
        { $set: { completionStatus: status } },
        { new: true }
      )
      .exec();
  }

  async blockFromChat(userId: string, courseId: string): Promise<EnrollmentDoc | null> {
    return this._model
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          courseId: new Types.ObjectId(courseId),
        },
        { $set: { isChatBlocked: true } },
        { new: true }
      )
      .exec();
  }

  // New method to unblock a student from chat
  async unblockFromChat(userId: string, courseId: string): Promise<EnrollmentDoc | null> {
    return this._model
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          courseId: new Types.ObjectId(courseId),
        },
        { $set: { isChatBlocked: false } },
        { new: true }
      )
      .exec();
  }

}