import { Request, Response } from "express";
import { IPaymentService } from "../interfaces/IServices";
import { Types } from "mongoose";

export class SubscriptionController {
  constructor(private paymentService: IPaymentService) {}

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

      const result = await this.paymentService.createSubscription(userId, plan, paymentType);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      console.error("Error in createSubscription:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  async confirmSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId || !Types.ObjectId.isValid(subscriptionId)) {
        res.status(400).json({ success: false, message: "Invalid or missing subscriptionId" });
        return;
      }

      const result = await this.paymentService.confirmSubscription(subscriptionId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      console.error("Error in confirmSubscription:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }
}
