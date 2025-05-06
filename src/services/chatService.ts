import { Types } from 'mongoose';
import { IChatRepository } from '../interfaces/IRepositories';
import { IResponse } from '../interfaces/IResponse';
import { IChatService } from '../interfaces/IServices';
import { IUserRepository } from '../interfaces/IRepositories';
import { ICourseRepository } from '../interfaces/IRepositories';
import { IEnrollmentRepository } from '../interfaces/IRepositories';


export class ChatService implements IChatService {
  constructor(
    private _chatRepository: IChatRepository,
    private _userRepository: IUserRepository,
    private _courseRepository: ICourseRepository,
    private _enrollmentRepository: IEnrollmentRepository
  ) {}

  async getMessages(courseId: string, page: number, limit: number, userId?: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(courseId)) {
        return { success: false, message: 'Invalid courseId' };
      }

      const course = await this._courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: 'Course not found' };
      }

      const skip = (page - 1) * limit;
      const messages = await this._chatRepository.findByCourseId(courseId, skip, limit);

      // Mark messages as read if userId is provided
      if (userId && Types.ObjectId.isValid(userId)) {
        await this._chatRepository.markMessagesAsRead(userId, courseId);
      }

      return {
        success: true,
        message: 'Messages fetched successfully',
        data: messages
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        success: false,
        message: 'Failed to fetch messages'
      };
    }
  }

  async sendMessage(userId: string, courseId: string, message: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        return { success: false, message: 'Invalid userId or courseId' };
      }

      const user = await this._userRepository.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const course = await this._courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: 'Course not found' };
      }

      const isInstructor = course.instructorRef.toString() === userId;
      const isEnrolled = await this._enrollmentRepository.findByUserAndCourse(userId, courseId);
      if (!isInstructor && !isEnrolled) {
        return { success: false, message: 'User is not authorized to send messages in this course' };
      }

      if (!message.trim()) {
        return { success: false, message: 'Message cannot be empty' };
      }

      const chatMessage = await this._chatRepository.createMessage({
        courseId: new Types.ObjectId(courseId),
        senderId: new Types.ObjectId(userId),
        message: message.trim(),
        readBy: [new Types.ObjectId(userId)] // Sender has read their own message
      });

      return {
        success: true,
        message: 'Message sent successfully',
        data: chatMessage
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        message: 'Failed to send message'
      };
    }
  }

  async getChatGroupMetadata(userId: string, courseIds: string[]): Promise<IResponse> {
    try {
      const metadata = await this._chatRepository.getChatGroupMetadata(userId, courseIds);
      console.log('ChatService.getChatGroupMetadata retrieved metadata:', JSON.stringify(metadata, null, 2));
      return {
        success: true,
        message: 'Chat group metadata retrieved successfully',
        data: metadata,
      };
    } catch (error) {
      console.error('Error in getChatGroupMetadata service:', error);
      return {
        success: false,
        message: 'failed to fetch chat group meta data', // This matches the UI error
      };
    }
  }
}

export default ChatService;