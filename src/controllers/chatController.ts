import { Response } from 'express';
import { Status } from '../utils/enums';
import { IChatService } from '../interfaces/IServices';
import { AuthRequest } from '../interfaces/AuthRequest';
import { MESSAGE_CONSTANTS } from '../constants/message_constants';

class ChatController {
  constructor(private _chatService: IChatService) {}

  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const userId = req.user?.id;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: 'User not authenticated.'
        });
        return;
      }

      const response = await this._chatService.getMessages(courseId, page, limit, userId);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in getMessages controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { message } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!message || typeof message !== 'string') {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Message is required and must be a string'
        });
        return;
      }

      const response = await this._chatService.sendMessage(userId, courseId, message);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in sendMessage controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getChatGroupMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, courseIds } = req.body;
      console.log('getChatGroupMetadata called with userId:', userId, 'courseIds:', courseIds);
      if (!userId || !courseIds || !Array.isArray(courseIds)) {
        console.log('Invalid request: userId or courseIds missing');
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'userId and courseIds are required',
        });
        return;
      }
      const response = await this._chatService.getChatGroupMetadata(userId, courseIds);
      console.log('getChatGroupMetadata response:', JSON.stringify(response, null, 2));
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in getChatGroupMetadata controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }
}

export default ChatController;