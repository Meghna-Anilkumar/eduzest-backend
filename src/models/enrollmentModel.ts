import { Schema, model, Document, Types } from "mongoose";


export interface EnrollmentDoc extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  enrolledAt: Date;
  completionStatus: "enrolled" | "in-progress" | "completed";
  createdAt: Date;
  updatedAt: Date;
}


const enrollmentSchema = new Schema<EnrollmentDoc>(
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
    enrolledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completionStatus: {
      type: String,
      enum: ["enrolled", "in-progress", "completed"],
      required: true,
      default: "enrolled",
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


export const Enrollments = model<EnrollmentDoc>("Enrollment", enrollmentSchema);