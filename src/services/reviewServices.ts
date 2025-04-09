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
}
