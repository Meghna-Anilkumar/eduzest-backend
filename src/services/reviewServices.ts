import { ReviewRepository } from "../repositories/reviewRepository";
import { EnrollmentRepository } from "../repositories/enrollmentRepository";
import { IResponse } from "../interfaces/IResponse";
import { IReviewService } from "../interfaces/IServices";
import { IReview } from "../interfaces/IReview";
import { IReviewRepository, IEnrollmentRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";

export class ReviewService implements IReviewService {
  private _reviewRepository: IReviewRepository;
  private _enrollmentRepository: IEnrollmentRepository;

  constructor(
    reviewRepository: ReviewRepository,
    enrollmentRepository: EnrollmentRepository
  ) {
    this._reviewRepository = reviewRepository;
    this._enrollmentRepository = enrollmentRepository;
  }

  async addReview(userId: string, reviewData: Partial<IReview>): Promise<IResponse> {
    try {
      // Validate courseId presence
      if (!reviewData.courseId) {
        return {
          success: false,
          message: "Course ID is required to submit a review.",
        };
      }

      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(reviewData.courseId.toString());

      // Check if the user is enrolled in the course
      const enrollment = await this._enrollmentRepository.findByUserAndCourse(
        userId,
        reviewData.courseId.toString()
      );

      if (!enrollment) {
        return {
          success: false,
          message: "You must be enrolled in the course to leave a review.",
        };
      }

      // Check if already reviewed (fixed to use reviewRepository)
      const existingReview = await this._reviewRepository.findByUserAndCourse(
        userId,
        reviewData.courseId.toString()
      );

      if (existingReview) {
        return {
          success: false,
          message: "You have already reviewed this course.",
        };
      }

      // Validate rating
      if (reviewData.rating && (reviewData.rating < 0 || reviewData.rating > 5)) {
        return {
          success: false,
          message: "Rating must be between 0 and 5.",
        };
      }

      // Create review
      const newReview = await this._reviewRepository.createReview({
        ...reviewData,
        userId: userObjectId,
        courseId: courseObjectId,
      });

      return {
        success: true,
        message: "Review added successfully.",
        data: newReview,
      };
    } catch (error) {
      console.error("Error adding review:", error);
      return {
        success: false,
        message: "Failed to add review. Please try again.",
      };
    }
  }


  async getReviewsByCourse(courseId: string, skip: number = 0, limit: number = 10): Promise<IResponse> {
    try {
      const reviews = await this._reviewRepository.getReviewsByCourse(courseId, skip, limit);
      const totalReviews = await this._reviewRepository.countReviewsByCourse(courseId);

      return {
        success: true,
        message: "Reviews fetched successfully.",
        data: { reviews, totalReviews },
      };
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch reviews. Please try again.",
      };
    }
  }


  async getReviewByUserAndCourse(userId: string, courseId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        return {
          success: false,
          message: "Invalid userId or courseId format.",
        };
      }

      const review = await this._reviewRepository.findByUserAndCourse(userId, courseId);

      if (!review) {
        return {
          success: false,
          message: "No review found for this user and course.",
        };
      }

      return {
        success: true,
        message: "Review fetched successfully.",
        data: review,
      };
    } catch (error) {
      console.error("Error fetching review by user and course:", error);
      return {
        success: false,
        message: "Failed to fetch review. Please try again.",
      };
    }
  }
}
