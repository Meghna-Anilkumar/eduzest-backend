import { Request, Response } from "express";
import { IPaymentService } from "../interfaces/IServices";
import { Types } from "mongoose";

export class SubscriptionController {
  constructor(private _paymentService: IPaymentService) {}

  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { userId, plan, paymentType } = req.body;

      if (!userId || !Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, message: "Invalid or missing userId" });
        return;
      }

      if (!["monthly", "yearly"].includes(plan)) {
        res.status(400).json({ success: false, message: "Invalid plan" });
        return;
      }

      if (!["debit", "credit"].includes(paymentType)) {
        res.status(400).json({ success: false, message: "Invalid payment type" });
        return;
      }

      const result = await this._paymentService.createSubscription(userId, plan, paymentType);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in createSubscription:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, message: errorMessage });
    }
  }

  async confirmSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId || !Types.ObjectId.isValid(subscriptionId)) {
        res.status(400).json({ success: false, message: "Invalid or missing subscriptionId" });
        return;
      }

      const result = await this._paymentService.confirmSubscription(subscriptionId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in confirmSubscription:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, message: errorMessage });
    }
  }

  async getSubscriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== "string" || !Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, message: "Invalid or missing userId" });
        return;
      }

      const result = await this._paymentService.getSubscriptionStatus(userId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in getSubscriptionStatus:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, message: errorMessage });
    }
  }
}