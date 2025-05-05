import { Types } from 'mongoose';
import { IAssessment, IAssessmentResult } from '../interfaces/IAssessments';
import { BaseRepository } from './baseRepository';
import { Assessment } from '../models/assessmentModel';
import { AssessmentResult } from '../models/assessmentResultModel';


export class AssessmentRepository extends BaseRepository<IAssessment> {
  private _resultModel: typeof AssessmentResult;

  constructor() {
    super(Assessment);
    this._resultModel = AssessmentResult;
  }

  async createAssessment(assessmentData: Partial<IAssessment>): Promise<IAssessment> {
    return this.create(assessmentData);
  }

  async findByCourseAndModule(
    courseId: string,
    moduleTitle: string,
    page: number,
    limit: number
  ): Promise<IAssessment[]> {
    return this._model
      .find({
        courseId: new Types.ObjectId(courseId),
        moduleTitle: moduleTitle,
      })
      .sort({ updatedAt: 'desc' })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countByCourseAndModule(courseId: string, moduleTitle: string): Promise<number> {
    return this._model.countDocuments({
      courseId: new Types.ObjectId(courseId),
      moduleTitle: moduleTitle,
    }).exec();
  }

  async findByIdAndInstructor(assessmentId: string, instructorId: string): Promise<IAssessment | null> {
    return this._model
      .findOne({
        _id: new Types.ObjectId(assessmentId),
        courseId: { $in: await this.getCourseIdsByInstructor(instructorId) },
      })
      .exec();
  }

  async updateAssessment(
    assessmentId: string,
    instructorId: string,
    updateData: Partial<IAssessment>
  ): Promise<IAssessment | null> {
    const assessment = await this._model.findOne({
      _id: new Types.ObjectId(assessmentId),
      courseId: { $in: await this.getCourseIdsByInstructor(instructorId) },
    });

    if (!assessment) {
      return null;
    }

    return this._model
      .findByIdAndUpdate(
        assessmentId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .exec();
  }

  async deleteAssessment(assessmentId: string, instructorId: string): Promise<boolean> {
    const result = await this._model.findOneAndDelete({
      _id: new Types.ObjectId(assessmentId),
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

  async findById(assessmentId: string): Promise<IAssessment | null> {
    return this._model.findById(assessmentId).exec();
  }

  async createOrUpdateResult(resultData: Partial<IAssessmentResult>): Promise<IAssessmentResult> {
    console.log("AssessmentRepository: createOrUpdateResult called with data", resultData);
    const existingResult = await this._resultModel.findOne({
      assessmentId: resultData.assessmentId,
      studentId: resultData.studentId,
    });

    if (existingResult) {
      console.log("AssessmentRepository: Existing result found, updating", { id: existingResult._id });
      const updatedResult = await this._resultModel
        .findByIdAndUpdate(
          existingResult._id,
          {
            $push: { attempts: resultData.attempts![0] },
            $set: {
              bestScore: resultData.bestScore,
              earnedPoints: resultData.earnedPoints,
              status: resultData.status,
              updatedAt: new Date(),
            },
          },
          { new: true, runValidators: true }
        )
        .exec();
      console.log("AssessmentRepository: Updated result", updatedResult);
      if (!updatedResult) {
        throw new Error("Failed to update assessment result");
      }
      return updatedResult;
    }

    console.log("AssessmentRepository: No existing result, creating new");
    const newResult = await this._resultModel.create(resultData);
    console.log("AssessmentRepository: Created new result", newResult);
    return newResult;
  }

  async findResultByAssessmentAndStudent(
    assessmentId: string,
    studentId: string
  ): Promise<IAssessmentResult | null> {
    return this._resultModel
      .findOne({
        assessmentId: new Types.ObjectId(assessmentId),
        studentId: new Types.ObjectId(studentId),
      })
      .exec();
  }


  async countAssessmentsByCourse(courseId: string): Promise<number> {
    console.log("AssessmentRepository: countAssessmentsByCourse", { courseId });
    return this._model.countDocuments({
      courseId: new Types.ObjectId(courseId),
    }).exec();
  }

  async countPassedAssessmentsByStudent(courseId: string, studentId: string): Promise<number> {
    console.log("AssessmentRepository: countPassedAssessmentsByStudent", { courseId, studentId });
    return this._resultModel
      .countDocuments({
        courseId: new Types.ObjectId(courseId),
        studentId: new Types.ObjectId(studentId),
        status: 'passed',
      })
      .exec();
  }

  async findByCourse(
    courseId: string,
    page: number,
    limit: number
  ): Promise<IAssessment[]> {
    return this._model
      .find({
        courseId: new Types.ObjectId(courseId),
      })
      .sort({ updatedAt: 'desc' })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countByCourse(courseId: string): Promise<number> {
    return this._model.countDocuments({
      courseId: new Types.ObjectId(courseId),
    }).exec();
  }



}




