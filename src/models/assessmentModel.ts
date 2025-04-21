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
});
const assessmentSchema = new Schema<IAssessment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleTitle: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    questions: { type: [questionSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Assessment = model<IAssessment>('Assessment', assessmentSchema);