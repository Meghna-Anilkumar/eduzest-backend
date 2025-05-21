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
      isActive: true,
      expirationDate: { $gte: now },
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
    });
  }

  async incrementUsedCount(couponId: string): Promise<ICoupon | null> {
    return await this.update(
      { _id: couponId },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
  }

  async findAllCoupons(page: number = 1, limit: number = 10): Promise<{ coupons: ICoupon[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      this._model.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this._model.countDocuments({})
    ]);

    return {
      coupons,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}