import { BaseRepository } from "./baseRepository";
import { Coupon, ICoupon } from "../models/couponModel";

export class CouponRepository extends BaseRepository<ICoupon> {
  constructor() {
    super(Coupon);
  }

  async findByCode(code: string): Promise<ICoupon | null> {
    return await this.findByQuery({ code: code.toUpperCase() });
  }

  async findActiveCoupons(): Promise<ICoupon[]> {
    const now = new Date();
    return await this._model.find({
      expirationDate: { $gte: now },
    });
  }

  async findAllCoupons(page: number = 1, limit: number = 10, search?: string): Promise<{ coupons: ICoupon[], total: number, page: number, totalPages: number }> {
  const skip = (page - 1) * limit;
  const query: any = {};
  

  if (search) {
    query.code = { $regex: search, $options: 'i' };
  }

  const [coupons, total] = await Promise.all([
    this._model
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this._model.countDocuments(query)
  ]);

  return {
    coupons,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

  async countActiveCoupons(): Promise<number> {
    const now = new Date();
    return await this._model.countDocuments({
      expirationDate: { $gte: now },
    });
  }


  async createCoupon(couponData: Partial<ICoupon>): Promise<ICoupon> {
    try {
      return await this._model.create(couponData);
    } catch (error) {
      console.error("Error creating coupon:", error);
      throw new Error("Could not create coupon");
    }
  }

  async updateCoupon(couponId: string, couponData: Partial<ICoupon>, options?: any): Promise<ICoupon | null> {
    try {
      const updatedCoupon = await this._model.findByIdAndUpdate(
        couponId, 
        couponData, 
        { new: true, ...options }
      );
      console.log("Updated Coupon:", updatedCoupon);
      return updatedCoupon;
    } catch (error) {
      console.error("Error updating coupon:", error);
      throw new Error("Could not update coupon");
    }
  }

  async deleteCoupon(couponId: string): Promise<boolean> {
    try {
      const result = await this._model.findByIdAndDelete(couponId);
      return result !== null;
    } catch (error) {
      console.error("Error deleting coupon:", error);
      throw new Error("Could not delete coupon");
    }
  }

  async findCouponById(couponId: string): Promise<ICoupon | null> {
    try {
      return await this._model.findById(couponId);
    } catch (error) {
      console.error("Error fetching coupon by ID:", error);
      throw new Error("Could not fetch coupon by ID");
    }
  }
}