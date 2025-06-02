import { Types, Document } from 'mongoose';

export interface IOption {
  id: string;
  text: string;
}

export interface IQuestion {
  id: string;
  questionText: string;
  options: IOption[];
  correctAnswerIndex: number;
  explanation: string;
  type: 'mcq' | 'true_false';
  marks: number;
}

export interface IExam extends Document {
  courseId: Types.ObjectId;
  title: string;
  description: string;
  duration: number;
  questions: IQuestion[];
  passingCriteria: number;
  totalMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamResult extends Document {
  examId: Types.ObjectId;
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  attempts: {
    score: number;
    passed: boolean;
    completedAt: Date;
    answers: {
      questionId: string;
      selectedAnswerIndex: number;
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