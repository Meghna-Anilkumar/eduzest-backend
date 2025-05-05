import { Types } from 'mongoose';
import { BaseRepository } from './baseRepository';
import { Chats} from '../models/chatModel';
import { IChat } from '../interfaces/IChat';
import { IChatRepository } from '../interfaces/IRepositories';

export class ChatRepository extends BaseRepository<IChat> implements IChatRepository {
  constructor() {
    super(Chats);
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
      return await this.create(chatData);
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw new Error('Could not create chat message');
    }
  }
}

export default ChatRepository;