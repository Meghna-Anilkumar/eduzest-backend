import { IEnrollmentRepository } from "../interfaces/IRepositories";
import { UserRepository } from "../repositories/userRepository";
import { CourseRepository } from "../repositories/courseRepository";
import { IResponse } from "../interfaces/IResponse";
import { Types } from "mongoose";
import { IRedisService } from "../interfaces/IServices";

export class EnrollCourseService {
  constructor(
    private enrollmentRepository: IEnrollmentRepository,
    private userRepository: UserRepository,
    private courseRepository: CourseRepository,
    private redisService: IRedisService
  ) {}


  async enrollFreeCourse(userId: string, courseId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        return { success: false, message: "Invalid userId or courseId" };
      }

      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(courseId);

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Check if course exists
      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: "Course not found" };
      }

      // Check if the course is free
      if (course.pricing.type !== "free") {
        return { success: false, message: "This course is not free. Please proceed with payment." };
      }

      // Check if user is already enrolled
      const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
      if (existingEnrollment) {
        return { success: false, message: "User is already enrolled in this course" };
      }

      // Create the enrollment
      const enrollment = await this.enrollmentRepository.createEnrollment({
        userId: userObjectId,
        courseId: courseObjectId,
        enrolledAt: new Date(),
        completionStatus: "enrolled",
      });

      // Increment the studentsEnrolled count in the Course collection
      await this.courseRepository.update(
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

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: "Course not found" };
      }

      const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
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

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const enrollments = await this.enrollmentRepository.findByUserId(userId);
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

      const enrollment = await this.enrollmentRepository.updateLessonProgress(userId, courseId, lessonId, progress);
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

      const progress = await this.enrollmentRepository.getLessonProgress(userId, courseId);
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
}

export default EnrollCourseService;