import { Schema, model, Document } from 'mongoose';
import { Types } from 'mongoose';

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

const assessmentResultSchema = new Schema<IAssessmentResult>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Courses', required: true },
    moduleTitle: { type: String, required: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attempts: [
      {
        score: { type: Number, required: true, min: 0 },
        passed: { type: Boolean, required: true },
        completedAt: { type: Date, default: Date.now },
        answers: [
          {
            questionId: { type: String, required: true },
            selectedAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
            isCorrect: { type: Boolean, required: true },
          },
        ],
      },
    ],
    bestScore: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, required: true, min: 0 },
    earnedPoints: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['inProgress', 'failed', 'passed'],
      default: 'inProgress',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assessmentResultSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

assessmentResultSchema.pre('save', function (next) {
  if (this.isModified('attempts')) {
    this.bestScore = this.attempts.reduce((max, attempt) => Math.max(max, attempt.score), 0);
    this.earnedPoints = this.bestScore;

    const hasPassedAttempt = this.attempts.some(attempt => attempt.passed);
    if (hasPassedAttempt) {
      this.status = 'passed';
    } else if (this.attempts.length > 0) {
      this.status = 'failed';
    } else {
      this.status = 'inProgress';
    }
  }
  next();
});

export const AssessmentResult = model<IAssessmentResult>('AssessmentResult', assessmentResultSchema);
