import { Types } from "mongoose";
import { ICourse } from "../interfaces/ICourse";
import { Course } from "../models/courseModel";
import { BaseRepository } from "./baseRepository";

export class CourseRepository extends BaseRepository<ICourse> {
    constructor() {
        super(Course);
    }

    async createCourse(courseData: Partial<ICourse>): Promise<ICourse> {
        return this.create(courseData);
    }

    // Find a course by title and instructor to check for duplicates
    async findByTitleAndInstructor(title: string, instructorId: Types.ObjectId): Promise<ICourse | null> {
        return this._model.findOne({
            title: { $regex: new RegExp(`^${title.trim()}$`, 'i') },
            instructorRef: instructorId,
        });
    }
}