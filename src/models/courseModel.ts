import { Schema, model, Types } from "mongoose";
import { ICourse, ILesson, IModule, ITrial } from "../interfaces/ICourse";

// Lesson Schema
const lessonSchema = new Schema<ILesson>({
    lessonNumber: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    video: {
        type: String,
        required: true
    },
    duration: {
        type: String,
    },
    objectives: {
        type: [String],
    }
});

// Module Schema
const moduleSchema = new Schema<IModule>({
    moduleTitle: {
        type: String,
        required: true
    },
    lessons: [lessonSchema]
});

// Trial Schema
const trialSchema = new Schema<ITrial>({
    video: {
        type: String
    }
});

// Course Schema
const courseSchema = new Schema<ICourse>({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    instructorRef: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    categoryRef: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    language: {
        type: String,
        required: true,
    },
    level: {
        type: String,
        required: true,
        enum: ["beginner", "intermediate", "advanced"],
    },
    modules: [moduleSchema],
    trial: trialSchema,
    pricing: {
        type: {
            type: String,
            enum: ["free", "paid"],
            default: "free"
        },
        amount: {
            type: Number,
            default: 0
        }
    },
    attachments: {
        title: String,
        url: String
    },
    isRequested: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    studentsEnrolled: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    isRejected: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

export const Course = model<ICourse>("Courses", courseSchema);