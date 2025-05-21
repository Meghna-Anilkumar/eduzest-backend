import { ICoupon } from "../models/couponModel";
import { IResponse } from "../interfaces/IResponse";
import { ICouponRepository } from "../interfaces/IRepositories";

export class CouponService {
  constructor(
    private _couponRepository: ICouponRepository
  ) { }

  async addCoupon(couponData: Partial<ICoupon>): Promise<IResponse> {
    try {
      if (!couponData.code || !couponData.discountPercentage || !couponData.expirationDate) {
        return {
          success: false,
          message: "Missing required fields: code, discountPercentage, expirationDate",
        };
      }

      if (couponData.discountPercentage < 0 || couponData.discountPercentage > 100) {
        return {
          success: false,
          message: "Discount percentage must be between 0 and 100",
        };
      }

      const existingCoupon = await this._couponRepository.findByCode(couponData.code);
      if (existingCoupon) {
        return {
          success: false,
          message: "Coupon code already exists",
        };
      }

      const now = new Date();
      if (new Date(couponData.expirationDate) < now) {
        return {
          success: false,
          message: "Expiration date must be in the future",
        };
      }

      const coupon = await this._couponRepository.create({
        ...couponData,
        code: couponData.code.toUpperCase(),
      });

      return {
        success: true,
        message: "Coupon created successfully",
        data: coupon,
      };
    } catch (error) {
      console.error("Error adding coupon:", error);
      return {
        success: false,
        message: "Failed to create coupon",
      };
    }
  }

  async editCoupon(couponId: string, couponData: Partial<ICoupon>): Promise<IResponse> {
    try {
      if (couponData.discountPercentage && (couponData.discountPercentage < 0 || couponData.discountPercentage > 100)) {
        return {
          success: false,
          message: "Discount percentage must be between 0 and 100",
        };
      }

      if (couponData.expirationDate && new Date(couponData.expirationDate) < new Date()) {
        return {
          success: false,
          message: "Expiration date must be in the future",
        };
      }

      const coupon = await this._couponRepository.findById(couponId);
      if (!coupon) {
        return {
          success: false,
          message: "Coupon not found",
        };
      }

      if (couponData.code && couponData.code !== coupon.code) {
        const existingCoupon = await this._couponRepository.findByCode(couponData.code);
        if (existingCoupon) {
          return {
            success: false,
            message: "Coupon code already exists",
          };
        }
      }

      const updatedCoupon = await this._couponRepository.update(
        couponId,
        { ...couponData, code: couponData.code?.toUpperCase() },
        { new: true }
      );

      if (!updatedCoupon) {
        return {
          success: false,
          message: "Failed to update coupon",
        };
      }

      return {
        success: true,
        message: "Coupon updated successfully",
        data: updatedCoupon,
      };
    } catch (error) {
      console.error("Error editing coupon:", error);
      return {
        success: false,
        message: "Failed to update coupon",
      };
    }
  }

  async deleteCoupon(couponId: string): Promise<IResponse> {
    try {
      const deleted = await this._couponRepository.delete(couponId);
      if (!deleted) {
        return {
          success: false,
          message: "Coupon not found or already deleted",
        };
      }

      return {
        success: true,
        message: "Coupon deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting coupon:", error);
      return {
        success: false,
        message: "Failed to delete coupon",
      };
    }
  }

  async getAllCoupons(page: number = 1, limit: number = 10): Promise<IResponse> {
    try {
      const { coupons, total, page: currentPage, totalPages } = await this._couponRepository.findAllCoupons(page, limit);
      return {
        success: true,
        message: "Coupons fetched successfully",
        data: {
          coupons,
          total,
          page: currentPage,
          totalPages
        },
      };
    } catch (error) {
      console.error("Error fetching coupons:", error);
      return {
        success: false,
        message: "Failed to fetch coupons",
      };
    }
  }
}