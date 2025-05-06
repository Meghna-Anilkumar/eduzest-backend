import { Document, Types } from 'mongoose';

export interface IChat extends Document {
    _id: Types.ObjectId;
    courseId: Types.ObjectId;
    senderId: Types.ObjectId;
    message: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    readBy: Types.ObjectId[];
    replyTo: Types.ObjectId | null;
}

export interface IChatGroupMetadata extends Document {
    courseId: Types.ObjectId;
    userId: Types.ObjectId;
    lastMessage: Types.ObjectId | null;
    unreadCount: number;
}