import { Request, Response } from 'express';
import { Status } from '../utils/enums';
import { IChatService } from '../interfaces/IServices';
import { AuthRequest } from '../interfaces/AuthRequest';

class ChatController {
  constructor(private _chatService: IChatService) {}

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const response = await this._chatService.getMessages(courseId, page, limit);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in getMessages controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
        console.log(req.body,'kkkkkkkkkkkk')
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
            message: 'Internal server error'
        });
    }
}
}

export default ChatController;