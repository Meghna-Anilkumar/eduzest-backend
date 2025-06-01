import mongoose, { Schema, Document } from "mongoose";
import { Types } from "mongoose";

export interface ISubscription extends Document {
  _id: Types.ObjectId; // Explicitly declare _id
  userId: Types.ObjectId;
  plan: "monthly" | "yearly";
  stripeSubscriptionId: string;
  status: "active" | "pending" | "canceled" | "expired" | "past_due"; // Add "past_due"
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["monthly", "yearly"], required: true },
    stripeSubscriptionId: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "pending", "canceled", "expired", "past_due"], // Add "past_due"
      default: "pending",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>("Subscription", subscriptionSchema);