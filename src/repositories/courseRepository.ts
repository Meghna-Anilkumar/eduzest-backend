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
     


    async findByTitleAndLevel(title: string, level: string): Promise<ICourse | null> {
        return this._model.findOne({
            title: title,
            level: level
        })
    }

    async getAllCoursesByInstructor(
        query: any,
        page: number,
        limit: number
    ): Promise<ICourse[]> {
        const courses = await this._model
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
        console.log("Courses from repository:", JSON.stringify(courses, null, 2));
        return courses;
    }
    async countDocuments(query: any): Promise<number> {
        return this._model.countDocuments(query).exec();
    }

    async getAllActiveCourses(query: any, page: number, limit: number, sort?: any): Promise<ICourse[]> {
        return this._model
            .find(query)
            .populate({
                path: "instructorRef",
                select: "name profile.profilePic",
            })
            .populate("categoryRef", "categoryName")
            .sort(sort || { updatedAt: "desc" })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();
    }

    async getCourseById(courseId: string): Promise<ICourse | null> {
        return this._model
            .findById(courseId)
            .populate({
                path: "instructorRef",
                select: "name email profile.profilePic",
            })
            .populate("categoryRef", "categoryName")
            .populate({
                path: "modules.lessons",
                select: "title duration video"
            })
            .exec();
    }

    async getCourseByInstructor(courseId: string, instructorId: string): Promise<ICourse | null> {
        return this._model
            .findOne({
                _id: courseId,
                instructorRef: new Types.ObjectId(instructorId),
            })
            .populate({
                path: "instructorRef",
                select: "name email profile.profilePic",
            })
            .populate("categoryRef", "categoryName")
            .populate({
                path: "modules.lessons",
                select: "title duration video",
            })
            .exec();
    }

    async editCourse(
        courseId: string,
        instructorId: string,
        updateData: Partial<ICourse>
    ): Promise<ICourse | null> {
        const course = await this._model.findOne({
            _id: courseId,
            instructorRef: new Types.ObjectId(instructorId),
        });

        if (!course) {
            return null;
        }

        return this._model
            .findByIdAndUpdate(
                courseId,
                { $set: updateData },
                { new: true, runValidators: true }
            )
            .populate({
                path: "instructorRef",
                select: "name email profile.profilePic",
            })
            .populate("categoryRef", "categoryName")
            .populate({
                path: "modules.lessons",
                select: "title duration video",
            })
            .exec();
    }

}