import { Request, Response } from "express";
import { ICouponService } from "../interfaces/IServices";
import { AuthRequest } from "../interfaces/AuthRequest";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";

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
        message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
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
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
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
        message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
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
        message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
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
        error: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }


  async checkCouponUsage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { couponId } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: MESSAGE_CONSTANTS.UNAUTHORIZED });
        return;
      }
      const result = await this._couponService.checkCouponUsage(userId, couponId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in checkCouponUsage:", error);
      res.status(500).json({ success: false, message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR});
    }
  }
}