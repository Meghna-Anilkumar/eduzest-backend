import { Document } from 'mongoose';
import { Types } from 'mongoose';

export interface IOption {
  id: string;
  text: string;
}

export interface IQuestion {
  id: string;
  text: string;
  options: IOption[];
  correctOption: string; 
}

export interface IAssessment extends Document {
  courseId: Types.ObjectId;
  moduleTitle: string;
  title: string;
  description: string;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}


