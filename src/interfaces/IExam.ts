import { Document, Types } from 'mongoose';

// Option interface matching your schema
export interface IOption {
  id: string;
  text: string;
}

// Question interface matching your schema
export interface IQuestion {
  id: string;
  questionText: string;
  options: IOption[];
  correctAnswerIndex: number;
  explanation?: string;
  type: 'mcq' | 'true_false';
  marks: number;
}

// Answer interface for exam attempts
export interface IAnswer {
  questionId: string;
  selectedAnswerIndex: number;
  isCorrect: boolean;
}

// Exam attempt interface
export interface IExamAttempt {
  score: number;
  passed: boolean;
  completedAt: Date;
  answers: IAnswer[];
}

// Main IExam interface extending Document (this fixes the first error)
export interface IExam extends Document {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  title: string;
  description?: string;
  duration: number;
  questions: IQuestion[];
  passingCriteria: number;
  totalMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

// IExamResult interface matching your schema
export interface IExamResult extends Document {
  _id: Types.ObjectId;
  examId: Types.ObjectId;
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  attempts: IExamAttempt[];
  bestScore: number;
  totalPoints: number;
  earnedPoints: number;
  status: 'inProgress' | 'failed' | 'passed';
  createdAt: Date;
  updatedAt: Date;
}