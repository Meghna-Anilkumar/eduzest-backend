import { Request, Response } from "express";
import { Status } from "../utils/enums";
import { IReviewService } from "../interfaces/IServices";
import { AuthRequest } from "../interfaces/AuthRequest";

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
                message: "Internal server error.",
            });
        }
    }


}

export default ReviewController;