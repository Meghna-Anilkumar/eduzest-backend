import { Schema, model, Types } from 'mongoose';

export interface INotification {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  courseId?: Types.ObjectId;
  type: 'course_update' | 'assessment_added' | 'assessment_updated' | 'exam_added' | 'exam_updated' | 'exam_deleted' | 'chat_message' | 'general';
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
    ref: "Courses",
    required: false,
  },
  type: {
    type: String,
    enum: ["course_update", "assessment_added", "assessment_updated", "exam_added", "exam_updated", "exam_deleted", "chat_message", "general"],
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