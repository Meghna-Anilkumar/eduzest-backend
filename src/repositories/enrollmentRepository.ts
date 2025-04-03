import { EnrollmentDoc, Enrollments } from "../models/enrollmentModel";
import { BaseRepository } from "./baseRepository";
import { IEnrollmentRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";

export class EnrollmentRepository extends BaseRepository<EnrollmentDoc> implements IEnrollmentRepository {
  constructor() {
    super(Enrollments);
  }

  // Find all enrollments for a specific user
  async findByUserId(userId: string): Promise<EnrollmentDoc[]> {
    return this._model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ enrolledAt: -1 })
      .limit(5)
      .populate('courseId'); // Assumes 'courseId' is a ref to a Course model
  }

  // Find all enrollments for a specific course
  async findByCourseId(courseId: string): Promise<EnrollmentDoc[]> {
    return this.findAll({ courseId: new Types.ObjectId(courseId) }, 0, { enrolledAt: -1 });
  }

  // Find a specific enrollment by userId and courseId
  async findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentDoc | null> {
    return this.findByQuery({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
  }

  // Create a new enrollment
  async createEnrollment(enrollmentData: Partial<EnrollmentDoc>): Promise<EnrollmentDoc> {
    return this.create(enrollmentData);
  }

  // Update the completion status of an enrollment
  async updateCompletionStatus(
    enrollmentId: string,
    status: EnrollmentDoc["completionStatus"]
  ): Promise<EnrollmentDoc | null> {
    return this.update({ _id: enrollmentId }, { completionStatus: status }, { new: true });
  }
}

export default EnrollmentRepository;
