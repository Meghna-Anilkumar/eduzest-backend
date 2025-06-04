import { Schema, model, Types } from 'mongoose';

export interface INotification {
  userId: Types.ObjectId;
  courseId?: Types.ObjectId;
  type: 'course_update' | 'assessment_added' | 'exam_added' | 'chat_message' | 'general';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: "Courses", // Fix: Changed from "Course" to "Courses" to match the registered model name
    required: false,
  },
  type: {
    type: String,
    enum: ["course_update", "assessment_added", "exam_added", "chat_message", "general"], // Fix: Updated enum to include all possible types
    required: true,
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export const NotificationModel = model<INotification>('Notification', notificationSchema);