import { Schema, model, Document, Types } from "mongoose";

export interface PaymentDoc extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  paymentType: "debit" | "credit";
  status: "pending" | "completed" | "failed" | "refunded";
  amount: number;
  stripePaymentId?: string;
  instructorPayout: {
    instructorId: Types.ObjectId;
    amount: number;
    status: "pending" | "completed" | "failed";
    transactionId?: string;
  };
  adminPayout: {
    amount: number;
    status: "pending" | "completed" | "failed";
    transactionId?: string;
  };
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
    instructorPayout: {
      instructorId: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
      transactionId: {
        type: String,
      },
    },
    adminPayout: {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
      transactionId: {
        type: String,
      },
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