import { Schema, model} from 'mongoose';
import { IOption, IQuestion, IExam, IExamResult } from '../interfaces/IExam'


const optionSchema = new Schema<IOption>({
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
});

const questionSchema = new Schema<IQuestion>({
    id: { type: String, required: true },
    questionText: { type: String, required: true, trim: true },
    options: { type: [optionSchema], required: true },
    correctAnswerIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, trim: true },
    type: { type: String, required: true, enum: ['mcq', 'true_false'] },
    marks: {
        type: Number,
        required: true,
        min: [1, 'Marks must be at least 1'],
        default: 1
    },
});

const examSchema = new Schema<IExam>(
    {
        courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        duration: {
            type: Number,
            required: true,
            min: [1, 'Duration must be at least 1 minute']
        },
        questions: { type: [questionSchema], default: [] },
        passingCriteria: {
            type: Number,
            required: true,
            min: [0, 'Passing criteria cannot be negative'],
            max: [100, 'Passing criteria cannot exceed 100']
        },
        totalMarks: {
            type: Number,
            required: true,
            min: [0, 'Total marks cannot be negative'],
            default: 0
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

examSchema.pre('save', function (next) {
    const calculatedTotalMarks = this.questions.reduce((sum, question) => sum + (question.marks || 0), 0);
    if (this.totalMarks === undefined || this.totalMarks < 0 || this.totalMarks !== calculatedTotalMarks) {
        this.totalMarks = calculatedTotalMarks;
    }
    next();
});

const examResultSchema = new Schema<IExamResult>(
    {
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
        courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        attempts: [
            {
                score: { type: Number, required: true, min: 0 },
                passed: { type: Boolean, required: true },
                completedAt: { type: Date, default: Date.now },
                answers: [
                    {
                        questionId: { type: String, required: true },
                        selectedAnswerIndex: { type: Number, required: true, min: -1 },
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

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

examResultSchema.pre('save', function (next) {
    if (this.isModified('attempts')) {
        this.bestScore = this.attempts.reduce((max, attempt) => Math.max(max, attempt.score), 0);
        this.earnedPoints = this.bestScore;
        const hasPassedAttempt = this.attempts.some(attempt => attempt.passed);
        this.status = hasPassedAttempt ? 'passed' : this.attempts.length > 0 ? 'failed' : 'inProgress';
    }
    next();
});

export const Exam = model<IExam>('Exam', examSchema);
export const ExamResult = model<IExamResult>('ExamResult', examResultSchema);