// interfaces/ICourseDTO.ts
import { Types } from "mongoose";

export interface ILessonDTO {
  lessonNumber: string;
  title: string;
  description: string;
  video: string;
  duration?: string;
  objectives?: string[];
}

export interface IModuleDTO {
  moduleTitle: string;
  lessons: ILessonDTO[];
}

export interface ITrialDTO {
  video?: string;
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
  _id: string; // Add this
  title: string;
  description: string;
  thumbnail: string;
  instructorRef: string;
  categoryRef: string;
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
}