import { BaseRepository } from "./baseRepository";
import { CouponUsage, ICouponUsage } from "../models/couponUsageModel";
import { Types } from 'mongoose'

export interface ICouponUsageRepository {
  hasUserUsedCoupon(userId: string, couponId: string): Promise<boolean>;
  recordCouponUsage(userId: string, couponId: string, courseId: string): Promise<ICouponUsage>;
}

export class CouponUsageRepository extends BaseRepository<ICouponUsage> implements ICouponUsageRepository {
  constructor() {
    super(CouponUsage);
  }

  async hasUserUsedCoupon(userId: string, couponId: string): Promise<boolean> {
    const usage = await this.findByQuery({
      userId: new Types.ObjectId(userId),
      couponId: new Types.ObjectId(couponId),
    });
    return !!usage;
  }

  async recordCouponUsage(userId: string, couponId: string, courseId: string): Promise<ICouponUsage> {
    return this.create({
      userId: new Types.ObjectId(userId),
      couponId: new Types.ObjectId(couponId),
      courseId: new Types.ObjectId(courseId),
    });
  }
}