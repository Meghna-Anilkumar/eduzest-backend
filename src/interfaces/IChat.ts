import { Document, Types } from 'mongoose';

export interface IChat extends Document {
    _id: Types.ObjectId;
    courseId: Types.ObjectId;
    senderId: Types.ObjectId;
    message: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}