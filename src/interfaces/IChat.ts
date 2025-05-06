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
}


export interface IChatGroupMetadata extends Document {
    courseId: Types.ObjectId;
    userId: Types.ObjectId;
    lastMessage: Types.ObjectId | null; // Reference to the last chat message
    unreadCount: number; // Number of unread messages for this user in this course
}