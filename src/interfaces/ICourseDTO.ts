import { Types } from "mongoose";

export interface ILessonDTO {
  _id: string;
  lessonNumber: string;
  title: string;
  description: string;
 
  videoKey: string; // Raw S3 key
  duration?: string;
  objectives?: string[];
}

export interface IModuleDTO {
  _id: string;
  moduleTitle: string;
  lessons: ILessonDTO[];
}

export interface ITrialDTO {
  video?: string; // Signed URL
  videoKey?: string; // Raw S3 key
}

export interface IPricing {
  type: "free" | "paid";
  amount: number;
}

export interface IAttachment {
  title?: string;
  url?: string;
}

export interface ICourseDTO {
  _id: string;
  title: string;
  description: string;
  thumbnail: string; // Signed URL
  thumbnailKey?: string; // Optional raw S3 key
  instructorRef: { _id: string; name?: string; profile?: { profilePic: string } } | string;
  categoryRef: { _id: string; categoryName?: string } | string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  modules: IModuleDTO[];
  trial: ITrialDTO;
  pricing: IPricing;
  attachments?: IAttachment;
  isRequested: boolean;
  isBlocked: boolean;
  studentsEnrolled: number;
  isPublished: boolean;
  isRejected: boolean;
  createdAt: Date;
  updatedAt: Date;
  offer?: {
        discountPercentage: number;
        offerPrice: number;
    };
}