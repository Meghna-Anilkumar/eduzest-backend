import { Schema, model} from 'mongoose';
import { IAssessment,IQuestion,IOption } from '../interfaces/IAssessments';

const optionSchema = new Schema<IOption>({
  id: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  text: { type: String, required: true, trim: true },
});


const questionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  options: { type: [optionSchema], required: true },
  correctOption: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  marks: { 
    type: Number, 
    required: true, 
    min: [1, 'Marks must be at least 1'], 
    default: 1 
  },
});


const assessmentSchema = new Schema<IAssessment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleTitle: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    questions: { type: [questionSchema], default: [] },
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


assessmentSchema.pre('save', function (next) {
  const calculatedTotalMarks = this.questions.reduce((sum, question) => sum + (question.marks || 0), 0);
  if (this.totalMarks === undefined || this.totalMarks < 0 || this.totalMarks !== calculatedTotalMarks) {
    this.totalMarks = calculatedTotalMarks;
  }
  next();
});

export const Assessment = model<IAssessment>('Assessment', assessmentSchema);