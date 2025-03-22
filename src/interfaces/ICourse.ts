import { Document, Types } from "mongoose";

// Interface for a Lesson
export interface ILesson extends Document {
    lessonNumber: string;
    title: string;
    description: string;
    video: string;
    duration?: string;
    objectives?: string[];
}

// Interface for a Module
export interface IModule extends Document {
    moduleTitle: string;
    lessons: ILesson[];
}

// Interface for Trial
export interface ITrial extends Document {
    video?: string;
}

// Interface for Pricing
export interface IPricing {
    type: "free" | "paid";
    amount: number;
}

// Interface for Attachments
export interface IAttachment {
    title?: string;
    url?: string;
}

// Main Course Interface
export interface ICourse extends Document {
    title: string;
    description: string;
    thumbnail: string;
    instructorRef: Types.ObjectId; 
    categoryRef: Types.ObjectId; 
    language: string;
    level: "beginner" | "intermediate" | "advanced";
    modules: IModule[];
    trial: ITrial;
    pricing: IPricing;
    attachments?: IAttachment;
    isRequested: boolean;
    isBlocked: boolean;
    studentsEnrolled: number;
    isPublished: boolean;
    isRejected: boolean;
    createdAt: Date;
    updatedAt: Date;
}