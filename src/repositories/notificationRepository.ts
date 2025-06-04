import { Types } from 'mongoose';
import { NotificationModel, INotification } from '../models/notificationModel';

export class NotificationRepository {
  async createNotification(userId: string, courseId: string | null, type: INotification['type'], message: string): Promise<INotification> {
    const notification = new NotificationModel({
      userId: new Types.ObjectId(userId),
      courseId: courseId ? new Types.ObjectId(courseId) : undefined,
      type,
      message,
    });
    return await notification.save();
  }

  async createNotificationsForUsers(userIds: string[], courseId: string, type: INotification['type'], message: string): Promise<INotification[]> {
    const notifications = userIds.map(userId => ({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      type,
      message,
    }));
    return await NotificationModel.insertMany(notifications);
  }

  async getNotifications(userId: string, page: number, limit: number): Promise<INotification[]> {
    try {
      return await NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'courseId',
          select: 'title',
          model: 'Courses',
        })
        .exec();
    } catch (error) {
      console.error('[NotificationRepository] Error fetching notifications:', error);
      return await NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
    }
  }

  async getRecentNotifications(
    userIds: string[],
    courseId: string,
    type: INotification['type'],
    message: string,
    timeWindowMs: number
  ): Promise<INotification[]> {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return await NotificationModel.find({
      userId: { $in: userIds.map(id => new Types.ObjectId(id)) },
      courseId: new Types.ObjectId(courseId),
      type,
      message,
      createdAt: { $gte: cutoffTime },
    }).exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await NotificationModel.countDocuments({ userId, isRead: false });
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await NotificationModel.updateOne(
      { _id: notificationId, userId },
      { isRead: true }
    );
    return result.modifiedCount > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
    return result.modifiedCount > 0;
  }
}