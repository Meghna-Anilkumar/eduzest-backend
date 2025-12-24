import { Types } from "mongoose";
import { Review } from "../models/reviewModel";
import { BaseRepository } from "./baseRepository";
import { IReviewRepository } from "../interfaces/IRepositories";
import { IReview } from "../interfaces/IReview";

export class ReviewRepository extends BaseRepository<IReview> implements IReviewRepository {
  constructor() {
    super(Review);
  }

  async createReview(reviewData: Partial<IReview>): Promise<IReview> {
    return this.create(reviewData);
  }

  async findByUserAndCourse(userId: string, courseId: string): Promise<IReview | null> {
    return this.findByQuery({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    });
  }

  async getReviewsByCourse(courseId: string, skip: number, limit: number): Promise<IReview[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new Error("Invalid courseId format");
    }
    
    return this._model
      .find({ courseId: new Types.ObjectId(courseId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "userId",
        model: "Users",
        select: "name profile"
      });
  }

  async countReviewsByCourse(courseId: string): Promise<number> {
    return this.count({ courseId: new Types.ObjectId(courseId) });
  }
}

export default ReviewRepository;