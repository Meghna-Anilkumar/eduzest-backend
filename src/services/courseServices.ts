import { Types } from "mongoose";
import { IResponse } from "../interfaces/IResponse";
import { ICourse, ITrial } from "../interfaces/ICourse";
import { ICourseRepository } from "../interfaces/IRepositories";
import { ICategoryRepository } from "../interfaces/IRepositories";
import { validateCourseData } from "../utils/courseValidation";
import { CustomError } from "../utils/CustomError";

export class CourseService {
  constructor(
    private _courseRepository: ICourseRepository,
    private _categoryRepository: ICategoryRepository
  ) { }

  async createCourse(courseData: Partial<ICourse>): Promise<IResponse> {
    try {
      await validateCourseData(courseData, this._categoryRepository);
      const trimmedTitle = courseData.title!.trim();
      const existingCourse = await this._courseRepository.findByTitleAndInstructor(
        trimmedTitle,
        courseData.instructorRef as Types.ObjectId
      );
      if (existingCourse) {
        return {
          success: false,
          message: "A course with this title already exists for this instructor.",
        };
      }

      const categoryRef = new Types.ObjectId(courseData.categoryRef as unknown as string);

      const defaultTrial: ITrial = {
        video: courseData.trial?.video || undefined,
      } as ITrial;

      const newCourse = await this._courseRepository.createCourse({
        ...courseData,
        title: trimmedTitle,
        categoryRef,
        trial: courseData.trial || defaultTrial,
        pricing: courseData.pricing || { type: "free", amount: 0 },
        attachments: courseData.attachments || undefined,
        isRequested: true,
        isBlocked: false,
        studentsEnrolled: 0,
        isPublished: false,
        isRejected: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: "Course created successfully.",
        data: newCourse,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        return {
          success: false,
          message: error.message,
          error: {
            message: error.message,
            field: error.field,
            statusCode: error.statusCode,
          },
        };
      }
      return {
        success: false,
        message: "An error occurred while creating the course.",
        error: { message: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }


  async getAllCourses(page: number, limit: number, search?: string): Promise<IResponse> {
    try {
      // Build query object for search
      const query: any = {};
      if (search) {
        query.title = { $regex: new RegExp(search, "i") }; // Case-insensitive search on title
      }

      const courses = await this._courseRepository.getAllCourses(query, page, limit);

      const totalCourses = await this._courseRepository.countDocuments(query);

      return {
        success: true,
        message: "Courses fetched successfully.",
        data: {
          courses,
          totalPages: Math.ceil(totalCourses / limit),
          currentPage: page,
          totalCourses,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "An error occurred while fetching courses.",
        error: { message: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }
}





export default CourseService;