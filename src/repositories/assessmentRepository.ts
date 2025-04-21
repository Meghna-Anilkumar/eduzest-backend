import { Types } from 'mongoose';
import { IAssessment } from '../interfaces/IAssessments';
import { BaseRepository } from './baseRepository';
import { Assessment } from '../models/assessmentModel';

export class AssessmentRepository extends BaseRepository<IAssessment> {
  constructor() {
    super(Assessment);
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
}