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

    async findByTitleAndInstructor(title: string, instructorId: Types.ObjectId): Promise<ICourse | null> {
        return this._model.findOne({
            title: { $regex: new RegExp(`^${title.trim()}$`, 'i') },
            instructorRef: instructorId,
        });
    }

    async getAllCourses(query: any, page: number, limit: number): Promise<ICourse[]> {
        return this._model
          .find(query)
          .populate({
            path: "instructorRef",
            select: "name profile.profilePic", 
          })
          .populate("categoryRef", "categoryName")
          .sort({ updatedAt: "desc" })
          .skip((page - 1) * limit)
          .limit(limit)
          .exec();
      }
    
      async countDocuments(query: any): Promise<number> {
        return this._model.countDocuments(query).exec();
      }
}