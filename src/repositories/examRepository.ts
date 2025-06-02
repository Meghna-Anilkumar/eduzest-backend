import { Types } from 'mongoose';
import { IExam, IExamResult } from '../interfaces/IExam'
import { ICourse } from '../interfaces/ICourse';
import { BaseRepository } from './baseRepository';
import { Exam, ExamResult } from '../models/examModel';
import { RedisService } from '../services/redisService';

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
    const existingResult = await this._resultModel.findOne({
      examId: resultData.examId,
      studentId: resultData.studentId,
    });

    if (existingResult) {
      const updatedAttempts = [...existingResult.attempts, resultData.attempts![0]];
      const hasPassed = updatedAttempts.some(attempt => attempt.passed);
      const bestScore = Math.max(...updatedAttempts.map(attempt => attempt.score));

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
        throw new Error("Failed to update exam result");
      }
      return updatedResult;
    }

    const newResultData = {
      ...resultData,
      bestScore: resultData.attempts![0].score,
      earnedPoints: resultData.attempts![0].score,
      status: resultData.attempts![0].passed ? 'passed' : 'failed',
    };
    return this._resultModel.create(newResultData);
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

  // NEW METHODS TO IMPLEMENT IExamRepository INTERFACE
  async findCourseById(courseId: string): Promise<ICourse | null> {
    return this._model.db.model('Courses').findById(courseId).exec();
  }

  async countTotalAssessments(courseId: string): Promise<number> {
    // Count all assessments for a specific course
    return this._model.db.model('Assessments').countDocuments({ 
      courseId: new Types.ObjectId(courseId) 
    }).exec();
  }

  async countPassedAssessments(courseId: string, studentId: string): Promise<number> {
    // Count assessments that a student has passed for a specific course
    return this._model.db.model('AssessmentResults').countDocuments({
      courseId: new Types.ObjectId(courseId),
      studentId: new Types.ObjectId(studentId),
      status: 'passed'
    }).exec();
  }
}