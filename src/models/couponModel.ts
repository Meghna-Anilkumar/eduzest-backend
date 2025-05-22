import { Schema, model, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  discountPercentage: number;
  maxDiscountAmount?: number;
  minPurchaseAmount?: number;
  expirationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const Coupon = model<ICoupon>("Coupon", couponSchema);