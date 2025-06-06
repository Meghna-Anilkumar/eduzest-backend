import { INotificationRepository } from '../interfaces/IRepositories';
import { IEnrollmentRepository } from '../interfaces/IRepositories';
import { IResponse } from '../interfaces/IResponse';
import { Server } from 'socket.io';

export class NotificationService {
  private _notificationRepository: INotificationRepository;
  private _enrollmentRepository: IEnrollmentRepository;
  private _io: Server | null;

  constructor(
    notificationRepository: INotificationRepository,
    enrollmentRepository: IEnrollmentRepository,
    io: Server | null = null
  ) {
    this._notificationRepository = notificationRepository;
    this._enrollmentRepository = enrollmentRepository;
    this._io = io;
  }

  async notifyCourseUpdate(courseId: string, message: string): Promise<IResponse> {
    try {
      const enrollments = await this._enrollmentRepository.findByCourseId(courseId);
      const userIds = enrollments
        .filter(e => !e.isChatBlocked)
        .map(e => e.userId.toString());

      if (userIds.length === 0) {
        console.log(`[NotificationService] No eligible students for courseId: ${courseId}`);
        return { success: true, message: 'No eligible students to notify' };
      }

      const recentNotifications = await this._notificationRepository.getRecentNotifications(
        userIds,
        courseId,
        'course_update',
        message,
        5000
      );

      const existingUserIds = recentNotifications.map(n => n.userId.toString());
      const usersToNotify = userIds.filter(userId => !existingUserIds.includes(userId));

      if (usersToNotify.length === 0) {
        console.log(`[NotificationService] Skipping duplicate notifications for courseId: ${courseId}`);
        return { success: true, message: 'No new notifications created (duplicates detected)' };
      }

      console.log(`[NotificationService] Creating notifications for ${usersToNotify.length} users for courseId: ${courseId}`);
      const notifications = await this._notificationRepository.createNotificationsForUsers(
        usersToNotify,
        courseId,
        'course_update',
        message
      );

      if (this._io) {
        for (const userId of usersToNotify) {
          const userNotifications = await this._notificationRepository.getNotifications(userId, 1, 10);
          const unreadCount = await this._notificationRepository.getUnreadCount(userId);
          this._io.to(userId).emit('notifications', {
            success: true,
            data: userNotifications,
            unreadCount,
          });
          console.log(`[NotificationService] Emitted notifications to user: ${userId}`);
        }
      }

      return { success: true, data: notifications, message: 'Notifications sent for course update' };
    } catch (error) {
      console.error('[NotificationService] Error notifying course update:', error);
      return { success: false, message: 'Failed to notify course update' };
    }
  }

  async notifyAssessmentAdded(courseId: string, message: string): Promise<IResponse> {
    try {
      const enrollments = await this._enrollmentRepository.findByCourseId(courseId);
      const userIds = enrollments
        .filter(e => !e.isChatBlocked)
        .map(e => e.userId.toString());

      if (userIds.length === 0) {
        return { success: true, message: 'No eligible students to notify' };
      }

      const notifications = await this._notificationRepository.createNotificationsForUsers(
        userIds,
        courseId,
        'assessment_added',
        message
      );

      if (this._io) {
        for (const userId of userIds) {
          const userNotifications = await this._notificationRepository.getNotifications(userId, 1, 10);
          const unreadCount = await this._notificationRepository.getUnreadCount(userId);
          this._io.to(userId).emit('notifications', {
            success: true,
            data: userNotifications,
            unreadCount,
          });
          console.log(`[NotificationService] Emitted notifications to user: ${userId}`);
        }
      }

      return { success: true, data: notifications, message: 'Notifications sent for assessment added' };
    } catch (error) {
      console.error('[NotificationService] Error notifying assessment added:', error);
      return { success: false, message: 'Failed to notify assessment added' };
    }
  }


  async notifyAssessmentUpdated(courseId: string, message: string): Promise<IResponse> {
    try {
      const enrollments = await this._enrollmentRepository.findByCourseId(courseId);
      const userIds = enrollments
        .filter(e => !e.isChatBlocked)
        .map(e => e.userId.toString());

      if (userIds.length === 0) {
        return { success: true, message: 'No eligible students to notify' };
      }

      const notifications = await this._notificationRepository.createNotificationsForUsers(
        userIds,
        courseId,
        'assessment_updated',
        message
      );

      if (this._io) {
        for (const userId of userIds) {
          const userNotifications = await this._notificationRepository.getNotifications(userId, 1, 10);
          const unreadCount = await this._notificationRepository.getUnreadCount(userId);
          this._io.to(userId).emit('notifications', {
            success: true,
            data: userNotifications,
            unreadCount,
          });
          console.log(`[NotificationService] Emitted notifications to user: ${userId}`);
        }
      }

      return { success: true, data: notifications, message: 'Notifications sent for assessment updated' };
    } catch (error) {
      console.error('[NotificationService] Error notifying assessment updated:', error);
      return { success: false, message: 'Failed to notify assessment updated' };
    }
  }

  async notifyExamAdded(courseId: string, message: string): Promise<IResponse> {
    try {
      const enrollments = await this._enrollmentRepository.findByCourseId(courseId);
      const userIds = enrollments
        .filter(e => !e.isChatBlocked)
        .map(e => e.userId.toString());

      if (userIds.length === 0) {
        return { success: true, message: 'No eligible students to notify' };
      }

      const notifications = await this._notificationRepository.createNotificationsForUsers(
        userIds,
        courseId,
        'exam_added',
        message
      );


      if (this._io) {
        for (const userId of userIds) {
          const userNotifications = await this._notificationRepository.getNotifications(userId, 1, 10);
          const unreadCount = await this._notificationRepository.getUnreadCount(userId);
          this._io.to(userId).emit('notifications', {
            success: true,
            data: userNotifications,
            unreadCount,
          });
          console.log(`[NotificationService] Emitted notifications to user: ${userId}`);
        }
      }

      return { success: true, data: notifications, message: 'Notifications sent for exam added' };
    } catch (error) {
      console.error('[NotificationService] Error notifying exam added:', error);
      return { success: false, message: 'Failed to notify exam added' };
    }
  }



  async notifyExamUpdated(courseId: string, message: string): Promise<IResponse> {
    try {
      const enrollments = await this._enrollmentRepository.findByCourseId(courseId);
      const userIds = enrollments
        .filter(e => !e.isChatBlocked)
        .map(e => e.userId.toString());

      if (userIds.length === 0) {
        console.log(`[NotificationService] No eligible students for courseId: ${courseId}`);
        return { success: true, message: 'No eligible students to notify' };
      }

      const uniqueMessage = `${message} (Updated at ${new Date().toISOString()})`;
      console.log(`[NotificationService] Generating exam updated notification for courseId: ${courseId}, message: ${uniqueMessage}`);

      const recentNotifications = await this._notificationRepository.getRecentNotifications(
        userIds,
        courseId,
        'exam_updated',
        uniqueMessage,
        5000
      );

      const existingUserIds = recentNotifications.map(n => n.userId.toString());
      const usersToNotify = userIds.filter(userId => !existingUserIds.includes(userId));

      if (usersToNotify.length === 0) {
        console.log(`[NotificationService] Skipping duplicate exam updated notifications for courseId: ${courseId}, users: ${userIds.join(', ')}`);
        return { success: true, message: 'No new notifications created (duplicates detected)' };
      }

      console.log(`[NotificationService] Creating exam updated notifications for users: ${usersToNotify.join(', ')}`);
      const notifications = await this._notificationRepository.createNotificationsForUsers(
        usersToNotify,
        courseId,
        'exam_updated',
        uniqueMessage
      );

      if (this._io) {
        for (const userId of usersToNotify) {
          const userNotifications = await this._notificationRepository.getNotifications(userId, 1, 10);
          const unreadCount = await this._notificationRepository.getUnreadCount(userId);
          this._io.to(userId).emit('notifications', {
            success: true,
            data: userNotifications,
            unreadCount,
          });
          const newNotification = notifications.find(n => n.userId.toString() === userId);
          if (newNotification) {
            this._io.to(userId).emit('newNotification', {
              success: true,
              data: newNotification,
              unreadCount,
            });
            console.log(`[NotificationService] Emitted newNotification for exam updated to user: ${userId}, id: ${newNotification._id}`);
          }
          console.log(`[NotificationService] Emitted notifications to user: ${userId}, count: ${userNotifications.length}, unread: ${unreadCount}`);
        }
      } else {
        console.error(`[NotificationService] Socket.IO instance not available for courseId: ${courseId}`);
      }

      return { success: true, data: notifications, message: 'Notifications sent for exam updated' };
    } catch (error) {
      console.error('[NotificationService] Error notifying exam updated:', error);
      return { success: false, message: 'Failed to notify exam updated' };
    }
  }

  async notifyExamDeleted(courseId: string, message: string): Promise<IResponse> {
    try {
      const enrollments = await this._enrollmentRepository.findByCourseId(courseId);
      const userIds = enrollments
        .filter(e => !e.isChatBlocked)
        .map(e => e.userId.toString());

      if (userIds.length === 0) {
        console.log(`[NotificationService] No eligible students for courseId: ${courseId}`);
        return { success: true, message: 'No eligible students to notify' };
      }

      const uniqueMessage = `${message} (Deleted at ${new Date().toISOString()})`;
      console.log(`[NotificationService] Generating exam deleted notification for courseId: ${courseId}, message: ${uniqueMessage}`);

      const recentNotifications = await this._notificationRepository.getRecentNotifications(
        userIds,
        courseId,
        'exam_deleted',
        uniqueMessage,
        5000
      );

      const existingUserIds = recentNotifications.map(n => n.userId.toString());
      const usersToNotify = userIds.filter(userId => !existingUserIds.includes(userId));

      if (usersToNotify.length === 0) {
        console.log(`[NotificationService] Skipping duplicate exam deleted notifications for courseId: ${courseId}, users: ${userIds.join(', ')}`);
        return { success: true, message: 'No new notifications created (duplicates detected)' };
      }

      console.log(`[NotificationService] Creating exam deleted notifications for users: ${usersToNotify.join(', ')}`);
      const notifications = await this._notificationRepository.createNotificationsForUsers(
        usersToNotify,
        courseId,
        'exam_deleted',
        uniqueMessage
      );

      if (this._io) {
        for (const userId of usersToNotify) {
          const userNotifications = await this._notificationRepository.getNotifications(userId, 1, 10);
          const unreadCount = await this._notificationRepository.getUnreadCount(userId);
          this._io.to(userId).emit('notifications', {
            success: true,
            data: userNotifications,
            unreadCount,
          });
          const newNotification = notifications.find(n => n.userId.toString() === userId);
          if (newNotification) {
            this._io.to(userId).emit('newNotification', {
              success: true,
              data: newNotification,
              unreadCount,
            });
            console.log(`[NotificationService] Emitted newNotification for exam deleted to user: ${userId}, id: ${newNotification._id}`);
          }
          console.log(`[NotificationService] Emitted notifications to user: ${userId}, count: ${userNotifications.length}, unread: ${unreadCount}`);
        }
      } else {
        console.error(`[NotificationService] Socket.IO instance not available for courseId: ${courseId}`);
      }

      return { success: true, data: notifications, message: 'Notifications sent for exam deleted' };
    } catch (error) {
      console.error('[NotificationService] Error notifying exam deleted:', error);
      return { success: false, message: 'Failed to notify exam deleted' };
    }
  }

  async getNotifications(userId: string, page: number, limit: number): Promise<IResponse> {
    try {
      const notifications = await this._notificationRepository.getNotifications(userId, page, limit);
      return { success: true, data: notifications, message: 'Notifications fetched successfully' };
    } catch (error) {
      console.error('[NotificationService] Error fetching notifications:', error);
      return { success: false, message: 'Failed to fetch notifications' };
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this._notificationRepository.getUnreadCount(userId);
    } catch (error) {
      console.error('[NotificationService] Error fetching unread count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<IResponse> {
    try {
      const success = await this._notificationRepository.markAsRead(notificationId, userId);
      if (success && this._io) {
        const unreadCount = await this._notificationRepository.getUnreadCount(userId);
        this._io.to(userId).emit('notificationRead', { notificationId, unreadCount });
      }
      return success
        ? { success: true, message: 'Notification marked as read' }
        : { success: false, message: 'Notification not found or already read' };
    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      return { success: false, message: 'Failed to mark notification as read' };
    }
  }

  async markAllAsRead(userId: string): Promise<IResponse> {
    try {
      const success = await this._notificationRepository.markAllAsRead(userId);
      if (success && this._io) {
        const unreadCount = await this._notificationRepository.getUnreadCount(userId);
        this._io.to(userId).emit('allNotificationsRead', { unreadCount });
      }
      return success
        ? { success: true, message: 'All notifications marked as read' }
        : { success: false, message: 'No notifications to mark as read' };
    } catch (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      return { success: false, message: 'Failed to mark all notifications as read' };
    }
  }


}