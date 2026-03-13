import { Request, Response } from "express";
import { Status } from "../utils/enums";
import { IReviewService } from "../interfaces/IServices";
import { AuthRequest } from "../interfaces/AuthRequest";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";

class ReviewController {
  constructor(private _reviewService: IReviewService) { }

  async addReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated.",
        });
        return;
      }

      const response = await this._reviewService.addReview(userId, req.body);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error("Error in addReview controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }


  async getReviewsByCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { skip = 0, limit = 10 } = req.query;

      if (!courseId) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID is required.",
        });
        return;
      }

      const response = await this._reviewService.getReviewsByCourse(
        courseId,
        parseInt(skip as string, 10),
        parseInt(limit as string, 10)
      );
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error("Error in getReviewsByCourse controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getReviewByUserAndCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { courseId } = req.params;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated.",
        });
        return;
      }

      if (!courseId) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID is required.",
        });
        return;
      }

      const response = await this._reviewService.getReviewByUserAndCourse(userId, courseId);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error("Error in getReviewByUserAndCourse controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

}

export default ReviewController;