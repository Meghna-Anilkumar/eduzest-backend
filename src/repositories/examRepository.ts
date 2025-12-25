import { Types } from 'mongoose';
import { IExam, IExamResult } from '../interfaces/IExam';
import { ICourse } from '../interfaces/ICourse';
import { BaseRepository } from './baseRepository';
import { Exam, ExamResult } from '../models/examModel';
import { RedisService } from '../services/redisService';
import { Assessment } from "../models/assessmentModel";
import { AssessmentResult } from "../models/assessmentResultModel";
import { PipelineStage } from "mongoose";
import { LeaderboardEntry } from "../interfaces/IExam";



export class ExamRepository extends BaseRepository<IExam> {
  private _resultModel: typeof ExamResult;
  private _redisService: RedisService;

  constructor(redisService: RedisService) {
    super(Exam);
    this._resultModel = ExamResult;
    this._redisService = redisService;
  }


  async createExam(examData: Partial<IExam>): Promise<IExam> {
    return this.create(examData);
  }

  async findByCourse(courseId: string, page: number, limit: number): Promise<IExam[]> {
    return this._model
      .find({ courseId: new Types.ObjectId(courseId) })
      .sort({ updatedAt: 'desc' })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countByCourse(courseId: string): Promise<number> {
    return this._model.countDocuments({ courseId: new Types.ObjectId(courseId) }).exec();
  }

  async findByIdAndInstructor(examId: string, instructorId: string): Promise<IExam | null> {
    return this._model
      .findOne({
        _id: new Types.ObjectId(examId),
        courseId: { $in: await this.getCourseIdsByInstructor(instructorId) },
      })
      .exec();
  }

  async updateExam(examId: string, instructorId: string, updateData: Partial<IExam>): Promise<IExam | null> {
    const exam = await this._model.findOne({
      _id: new Types.ObjectId(examId),
      courseId: { $in: await this.getCourseIdsByInstructor(instructorId) },
    });

    if (!exam) {
      return null;
    }

    return this._model
      .findByIdAndUpdate(
        examId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .exec();
  }

  async deleteExam(examId: string, instructorId: string): Promise<boolean> {
    const result = await this._model.findOneAndDelete({
      _id: new Types.ObjectId(examId),
      courseId: { $in: await this.getCourseIdsByInstructor(instructorId) },
    });
    return result !== null;
  }

  async getCourseIdsByInstructor(instructorId: string): Promise<Types.ObjectId[]> {
    const courses = await this._model.db.model('Courses').find({
      instructorRef: new Types.ObjectId(instructorId),
    }).select('_id');
    return courses.map(course => course._id);
  }

  async findById(examId: string): Promise<IExam | null> {
    return this._model.findById(examId).exec();
  }

  async createOrUpdateResult(resultData: Partial<IExamResult>): Promise<IExamResult> {
    console.log('[ExamRepository] Creating or updating result:', resultData);
    const existingResult = await this._resultModel.findOne({
      examId: resultData.examId,
      studentId: resultData.studentId,
    });
    console.log('[ExamRepository] Existing result:', existingResult);

    if (existingResult) {
      const updatedAttempts = [...existingResult.attempts, resultData.attempts![0]];
      const hasPassed = updatedAttempts.some(attempt => attempt.passed);
      const bestScore = Math.max(...updatedAttempts.map(attempt => attempt.score));
      console.log('[ExamRepository] Updating result with new attempt:', { updatedAttempts, hasPassed, bestScore });

      const updatedResult = await this._resultModel
        .findByIdAndUpdate(
          existingResult._id,
          {
            $push: { attempts: resultData.attempts![0] },
            $set: {
              bestScore,
              earnedPoints: bestScore,
              status: hasPassed ? 'passed' : 'failed',
              updatedAt: new Date(),
            },
          },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updatedResult) {
        console.error('[ExamRepository] Failed to update result:', existingResult._id);
        throw new Error("Failed to update exam result");
      }
      console.log('[ExamRepository] Updated result:', updatedResult);

      await this._redisService.del(`leaderboard:global`);
      await this._redisService.del(`leaderboard:course:${updatedResult.courseId}`);

      return updatedResult;
    }

    const newResultData = {
      ...resultData,
      bestScore: resultData.attempts![0].score,
      earnedPoints: resultData.attempts![0].score,
      status: resultData.attempts![0].passed ? 'passed' : 'failed',
    };
    console.log('[ExamRepository] Creating new result:', newResultData);
    const newResult = await this._resultModel.create(newResultData);
    console.log('[ExamRepository] Created new result:', newResult);


    await this._redisService.del(`leaderboard:global`);
    await this._redisService.del(`leaderboard:course:${newResult.courseId}`);

    return newResult;
  }

  async findResultByExamAndStudent(examId: string, studentId: string): Promise<IExamResult | null> {
    return this._resultModel
      .findOne({
        examId: new Types.ObjectId(examId),
        studentId: new Types.ObjectId(studentId),
      })
      .exec();
  }

  async startExam(examId: string, studentId: string): Promise<string> {
    const key = `exam:${examId}:${studentId}:startTime`;
    const startTime = new Date().toISOString();
    await this._redisService.set(key, startTime, 3600);
    return startTime;
  }

  async getExamStartTime(examId: string, studentId: string): Promise<string | null> {
    return this._redisService.get(`exam:${examId}:${studentId}:startTime`);
  }

  async findCourseById(courseId: string): Promise<ICourse | null> {
    return this._model.db.model('Courses').findById(courseId).exec();
  }

  async countTotalAssessments(courseId: string): Promise<number> {
    return Assessment.countDocuments({ courseId: new Types.ObjectId(courseId) }).exec();
  }

  async countPassedAssessments(courseId: string, studentId: string): Promise<number> {
    return AssessmentResult.countDocuments({
      courseId: new Types.ObjectId(courseId),
      studentId: new Types.ObjectId(studentId),
      status: "passed",
    }).exec();
  }

  async findByCourseAndModule(
    courseId: string,
    moduleTitle: string,
    page: number,
    limit: number
  ): Promise<IExam[]> {
    return this._model
      .find({
        courseId: new Types.ObjectId(courseId),
        moduleTitle,
      })
      .sort({ updatedAt: "desc" })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countByCourseAndModule(courseId: string, moduleTitle: string): Promise<number> {
    return this._model
      .countDocuments({
        courseId: new Types.ObjectId(courseId),
        moduleTitle,
      })
      .exec();
  }


  async getLeaderboard(
    courseId?: string,
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = courseId ? `leaderboard:course:${courseId}` : `leaderboard:global`;
    const cached = await this._redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const pipeline: PipelineStage[] = [];
    if (courseId) {
      pipeline.push({ $match: { courseId: new Types.ObjectId(courseId) } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$studentId',
          totalScore: { $sum: '$bestScore' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          studentId: '$_id',
          studentName: '$student.name',
          totalScore: 1,
          _id: 0,
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      {
        $setWindowFields: {
          sortBy: { totalScore: -1 },
          output: {
            rank: { $rank: {} },
          },
        },
      }
    );

    const leaderboard = await this._resultModel
      .aggregate<LeaderboardEntry>(pipeline)
      .exec();
    await this._redisService.set(cacheKey, JSON.stringify(leaderboard), 3600);
    return leaderboard;
  }


  async getStudentRank(studentId: string, courseId?: string): Promise<{
    rank: number;
    totalScore: number;
  } | null> {
    const pipeline: PipelineStage[] = [];

    console.log(`[ExamRepository] getStudentRank: studentId=${studentId}, courseId=${courseId}`);

    if (courseId && Types.ObjectId.isValid(courseId)) {
      pipeline.push({
        $match: { courseId: new Types.ObjectId(courseId) },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$studentId",
          totalScore: { $sum: "$bestScore" },
        },
      },
      {
        $sort: { totalScore: -1 },
      },
      {
        $setWindowFields: {
          sortBy: { totalScore: -1 },
          output: {
            rank: { $rank: {} },
          },
        },
      },
      {
        $match: { _id: new Types.ObjectId(studentId) },
      },
      {
        $project: {
          rank: 1,
          totalScore: 1,
          _id: 0,
        },
      }
    );

    try {
      const result = await this._resultModel.aggregate(pipeline).exec();
      console.log(`[ExamRepository] getStudentRank result:`, result);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`[ExamRepository] getStudentRank error:`, error);
      throw error;
    }
  }
}