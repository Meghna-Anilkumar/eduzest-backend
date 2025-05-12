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
  marks: number;
}

export interface IAssessment extends Document {
  courseId: Types.ObjectId;
  moduleTitle: string;
  title: string;
  description: string;
  questions: IQuestion[];
  totalMarks: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface IAssessmentResult extends Document {
  assessmentId: Types.ObjectId;
  courseId: Types.ObjectId;
  moduleTitle: string;
  studentId: Types.ObjectId;
  attempts: {
    score: number;
    passed: boolean;
    completedAt: Date;
    answers: {
      questionId: string;
      selectedAnswer: string;
      isCorrect: boolean;
    }[];
  }[];
  bestScore: number;
  totalPoints: number;
  earnedPoints: number;
  status: 'inProgress' | 'failed' | 'passed';
  createdAt: Date;
  updatedAt: Date;
}

