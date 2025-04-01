import { Schema, model, Document, Types } from "mongoose";

export interface PaymentDoc extends Document {
  userId: Types.ObjectId; // Changed to Types.ObjectId
  courseId: Types.ObjectId; // Changed to Types.ObjectId
  paymentType: "debit" | "credit";
  status: "pending" | "completed" | "failed" | "refunded";
  amount: number;
  stripePaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Courses",
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    stripePaymentId: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Payments = model<PaymentDoc>("Payment", paymentSchema);