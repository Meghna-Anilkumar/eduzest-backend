import { model, Schema } from 'mongoose';
import { IChat } from '../interfaces/IChat';
import { IChatGroupMetadata } from '../interfaces/IChat';

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
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: []
  }]
}, {
  timestamps: true
});

export const Chats = model<IChat>('Chats', chatSchema);



const chatGroupMetadataSchema = new Schema<IChatGroupMetadata>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Courses',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Chats',
    default: null
  },
  unreadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const ChatGroupMetadata = model<IChatGroupMetadata>('ChatGroupMetadata', chatGroupMetadataSchema);