import { Request, Response } from "express";
import { ICouponService } from "../interfaces/IServices";
import { AuthRequest } from "../interfaces/AuthRequest";

export class CouponController {


  constructor(
    private _couponService: ICouponService
  ) { }

  async addCoupon(req: Request, res: Response) {
    try {
      const couponData = req.body;
      const result = await this._couponService.addCoupon(couponData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error("Error in addCoupon controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async editCoupon(req: Request, res: Response) {
    try {
      const couponId = req.params.id;
      const couponData = req.body;
      const result = await this._couponService.editCoupon(couponId, couponData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in editCoupon controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteCoupon(req: Request, res: Response) {
    try {
      const couponId = req.params.id;
      const result = await this._couponService.deleteCoupon(couponId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in deleteCoupon controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getAllCoupons(req: Request, res: Response) {
    try {
      const result = await this._couponService.getAllCoupons();
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in getAllCoupons controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  async getActiveCoupons(req: Request, res: Response) {
    try {
      const result = await this._couponService.getActiveCoupons();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch coupons",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }


  async checkCouponUsage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { couponId } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const result = await this._couponService.checkCouponUsage(userId, couponId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in checkCouponUsage:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}