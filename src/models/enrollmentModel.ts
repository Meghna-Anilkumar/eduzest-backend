import { Schema, model, Document, Types } from "mongoose";
import { ICourse } from "../interfaces/ICourse"
import { ICourseDTO } from "../interfaces/ICourseDTO";

export interface LessonProgress {
  lessonId: Types.ObjectId;
  progress: number; 
  isCompleted: boolean;
  lastWatched: Date;
}

export interface EnrollmentDoc extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  enrolledAt: Date;
  completionStatus: "enrolled" | "in-progress" | "completed";
  lessonProgress: LessonProgress[];
  isChatBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedEnrollmentDoc extends Omit<EnrollmentDoc, 'courseId'> {
  courseId: ICourse | null;
}

export interface EnrollmentWithSignedUrls extends Omit<EnrollmentDoc, 'courseId'> {
  courseId: ICourseDTO | null;
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
    lessonProgress: [
      {
        lessonId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        progress: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
          max: 100,
        },
        isCompleted: {
          type: Boolean,
          required: true,
          default: false,
        },
        lastWatched: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    isChatBlocked: {
      type: Boolean,
      required: true,
      default: false, 
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