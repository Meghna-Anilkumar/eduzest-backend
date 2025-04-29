import { IEnrollmentRepository } from "../interfaces/IRepositories";
import { IUserRepository } from "../interfaces/IRepositories";
import { ICourseRepository } from "../interfaces/IRepositories";
import { IResponse } from "../interfaces/IResponse";
import { Types } from "mongoose";
import { IRedisService } from "../interfaces/IServices";
import { CourseStats } from "../interfaces/ICourseStats";
import { PaymentDoc } from "../models/paymentModel";
import { ICourse } from "../interfaces/ICourse";
import { EnrollmentDoc } from "../models/enrollmentModel";
import { IPaymentRepository } from "../interfaces/IRepositories";

export class EnrollCourseService {
  constructor(
    private _enrollmentRepository: IEnrollmentRepository,
    private _userRepository: IUserRepository,
    private _courseRepository: ICourseRepository,
    private _paymentRepository: IPaymentRepository,
  ) { }


  async enrollFreeCourse(userId: string, courseId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        return { success: false, message: "Invalid userId or courseId" };
      }

      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(courseId);

      const user = await this._userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Check if course exists
      const course = await this._courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: "Course not found" };
      }

      // Check if the course is free
      if (course.pricing.type !== "free") {
        return { success: false, message: "This course is not free. Please proceed with payment." };
      }

      // Check if user is already enrolled
      const existingEnrollment = await this._enrollmentRepository.findByUserAndCourse(userId, courseId);
      if (existingEnrollment) {
        return { success: false, message: "User is already enrolled in this course" };
      }

      // Create the enrollment
      const enrollment = await this._enrollmentRepository.createEnrollment({
        userId: userObjectId,
        courseId: courseObjectId,
        enrolledAt: new Date(),
        completionStatus: "enrolled",
      });

      // Increment the studentsEnrolled count in the Course collection
      await this._courseRepository.update(
        { _id: courseObjectId },
        { $inc: { studentsEnrolled: 1 } }
      );

      return {
        success: true,
        message: "Successfully enrolled in the free course",
        data: enrollment,
      };
    } catch (error) {
      console.error("Error enrolling user in free course:", error);
      return {
        success: false,
        message: "Failed to enroll in the free course",
      };
    }
  }


  async checkEnrollment(userId: string, courseId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        return { success: false, message: "Invalid userId or courseId" };
      }

      const user = await this._userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const course = await this._courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: "Course not found" };
      }

      const enrollment = await this._enrollmentRepository.findByUserAndCourse(userId, courseId);
      if (!enrollment) {
        return {
          success: true,
          message: "User is not enrolled in this course",
          data: { isEnrolled: false },
        };
      }

      return {
        success: true,
        message: "User is enrolled in this course",
        data: { isEnrolled: true, enrollment },
      };
    } catch (error) {
      console.error("Error checking enrollment:", error);
      return {
        success: false,
        message: "Failed to check enrollment status",
      };
    }
  }

  async getEnrollmentsByUserId(userId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid userId" };
      }

      const user = await this._userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const enrollments = await this._enrollmentRepository.findByUserId(userId);
      return {
        success: true,
        message: "Enrollments fetched successfully",
        data: enrollments,
      };
    } catch (error) {
      console.error("Error fetching enrollments for user:", error);
      return {
        success: false,
        message: "Failed to fetch enrollments",
      };
    }
  }


  async updateLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    progress: number
  ): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(lessonId)) {
        return { success: false, message: "Invalid userId, courseId, or lessonId" };
      }

      const enrollment = await this._enrollmentRepository.updateLessonProgress(userId, courseId, lessonId, progress);
      if (!enrollment) {
        return { success: false, message: "Enrollment not found" };
      }

      return {
        success: true,
        message: "Lesson progress updated successfully",
        data: enrollment.lessonProgress,
      };
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      return {
        success: false,
        message: "Failed to update lesson progress",
      };
    }
  }

  async getLessonProgress(userId: string, courseId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        return { success: false, message: "Invalid userId or courseId" };
      }

      const progress = await this._enrollmentRepository.getLessonProgress(userId, courseId);
      return {
        success: true,
        message: "Lesson progress fetched successfully",
        data: progress,
      };
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      return {
        success: false,
        message: "Failed to fetch lesson progress",
      };
    }
  }


  async getInstructorCourseStats(instructorId: string): Promise<CourseStats[]> {
    try {
      const courses: ICourse[] = await this._courseRepository.getAllCoursesByInstructor(
        { instructorRef: new Types.ObjectId(instructorId) },
        1,
        10
      );

      const courseStats: CourseStats[] = [];

      for (const course of courses) {
        const courseId = course._id as Types.ObjectId;

        const enrollments: EnrollmentDoc[] = await this._enrollmentRepository.findByCourseId(courseId.toString());

        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter(
          (e) => e.completionStatus === "completed"
        ).length;
        const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

        const totalProgress = enrollments.reduce((sum, e) => {
          const progress = e.lessonProgress.reduce((p, lp) => p + lp.progress, 0);
          return sum + (progress / (e.lessonProgress.length || 1));
        }, 0);
        const averageProgress = totalEnrollments > 0 ? totalProgress / totalEnrollments : 0;

        const payments: PaymentDoc[] = await this._paymentRepository.findByCourseId(courseId.toString());
        const totalRevenue = payments.reduce((sum: number, p: PaymentDoc) => {
          return sum + (p.instructorPayout?.amount || 0);
        }, 0);

        courseStats.push({
          courseId: courseId.toString(),
          title: course.title,
          totalEnrollments,
          completedEnrollments,
          completionRate: Number(completionRate.toFixed(2)),
          totalRevenue,
          averageProgress: Number(averageProgress.toFixed(2)),
        });
      }

      return courseStats;
    } catch (error) {
      console.error("Error fetching instructor course stats:", error);
      throw new Error("Could not fetch course statistics");
    }
  }

}

export default EnrollCourseService;