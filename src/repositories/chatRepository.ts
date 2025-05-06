import { Types } from 'mongoose';
import { BaseRepository } from './baseRepository';
import { Chats, ChatGroupMetadata } from '../models/chatModel';
import { IChat, IChatGroupMetadata } from '../interfaces/IChat';
import { IChatRepository } from '../interfaces/IRepositories';
import { IEnrollmentRepository } from '../interfaces/IRepositories';

export class ChatRepository extends BaseRepository<IChat> implements IChatRepository {
  private enrollmentRepository: IEnrollmentRepository;

  constructor(enrollmentRepository: IEnrollmentRepository) {
    super(Chats);
    this.enrollmentRepository = enrollmentRepository;
  }

  async findByCourseId(courseId: string, skip: number, limit: number): Promise<IChat[]> {
    try {
      return await this._model
        .find({ courseId: new Types.ObjectId(courseId) })
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name role profile.profilePic');
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw new Error('Could not fetch chat messages');
    }
  }

  async createMessage(chatData: Partial<IChat>): Promise<IChat> {
    try {
      const message = await this.create(chatData);
      const courseId = chatData.courseId!;
      const senderId = chatData.senderId!;
      await this.updateChatGroupMetadata(courseId, senderId, message._id);
      return message;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw new Error('Could not create chat message');
    }
  }

  async getChatGroupMetadata(userId: string, courseIds: string[]): Promise<IChatGroupMetadata[]> {
    try {
      return await ChatGroupMetadata
        .find({
          userId: new Types.ObjectId(userId),
          courseId: { $in: courseIds.map(id => new Types.ObjectId(id)) }
        })
        .populate({
          path: 'lastMessage',
          populate: { path: 'senderId', select: 'name role profile.profilePic' }
        });
    } catch (error) {
      console.error('Error fetching chat group metadata:', error);
      throw new Error('Could not fetch chat group metadata');
    }
  }

  async updateChatGroupMetadata(courseId: Types.ObjectId, senderId: Types.ObjectId, messageId: Types.ObjectId): Promise<void> {
    try {
      const course = await this._model.db.model('Courses').findById(courseId);
      if (!course) return;

      const enrollments = await this.enrollmentRepository.findByCourseId(courseId.toString());
      const userIds = [
        course.instructorRef,
        ...enrollments.map(e => e.userId)
      ].filter(id => id.toString() !== senderId.toString());

      for (const userId of userIds) {
        await ChatGroupMetadata.findOneAndUpdate(
          { courseId, userId },
          {
            $set: { lastMessage: messageId },
            $inc: { unreadCount: 1 }
          },
          { upsert: true, new: true }
        );
      }

      await ChatGroupMetadata.findOneAndUpdate(
        { courseId, userId: senderId },
        { $set: { lastMessage: messageId } },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error updating chat group metadata:', error);
      throw new Error('Could not update chat group metadata');
    }
  }

  async markMessagesAsRead(userId: string, courseId: string): Promise<void> {
    try {
      await Chats.updateMany(
        { courseId: new Types.ObjectId(courseId), readBy: { $ne: new Types.ObjectId(userId) } },
        { $addToSet: { readBy: new Types.ObjectId(userId) } }
      );

      await ChatGroupMetadata.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), courseId: new Types.ObjectId(courseId) },
        { $set: { unreadCount: 0 } }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Could not mark messages as read');
    }
  }
}

export default ChatRepository;
