import { model, Schema} from 'mongoose';
import { IChat } from '../interfaces/IChat';

const chatSchema = new Schema<IChat>({
  courseId: {
    type: Schema.Types.ObjectId, 
    ref: 'Courses',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId, 
    ref: 'Users',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const Chats = model<IChat>('Chats', chatSchema);
