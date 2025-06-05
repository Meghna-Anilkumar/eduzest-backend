import { Schema, model, Document, Types } from "mongoose";

export interface ICouponUsage extends Document {
  userId: Types.ObjectId;
  couponId: Types.ObjectId;
  courseId: Types.ObjectId;
  appliedAt: Date;
}

const couponUsageSchema = new Schema<ICouponUsage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
  courseId: { type: Schema.Types.ObjectId, ref: "Courses", required: true },
  appliedAt: { type: Date, default: Date.now },
});

export const CouponUsage = model<ICouponUsage>("CouponUsage", couponUsageSchema);