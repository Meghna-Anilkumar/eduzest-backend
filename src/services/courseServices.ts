import { Types } from "mongoose";
import { IResponse } from "../interfaces/IResponse";
import { ICourse } from "../interfaces/ICourse";
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
      const level = courseData.level
      const existingCourse = await this._courseRepository.findByTitleAndInstructor(
        trimmedTitle,
        courseData.instructorRef as Types.ObjectId
      );
      if (!level) {
        return {
          success: false,
          message: 'course level is required'
        }
      }
      const exists = await this._courseRepository.findByTitleAndLevel(trimmedTitle, level)
      if (exists) {
        return {
          success: false,
          message: 'course with this title and level exists already'
        }
      }
      if (existingCourse) {
        return {
          success: false,
          message: "Course with this title already exists",
        };
      }

      const categoryRef = new Types.ObjectId(courseData.categoryRef as unknown as string);

      const newCourse = await this._courseRepository.createCourse({
        ...courseData,
        title: trimmedTitle,
        categoryRef,
        pricing: courseData.pricing || { type: "free", amount: 0 },
        attachments: courseData.attachments || undefined,
        isRequested: true,
        isBlocked: false,
        studentsEnrolled: 0,
        isPublished: true,
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


  async getAllCoursesByInstructor(
    instructorId: string,
    page: number,
    limit: number,
    search?: string
  ): Promise<IResponse> {
    try {
      const query: any = {
        instructorRef: new Types.ObjectId(instructorId),
      };
      if (search) {
        query.title = { $regex: new RegExp(search, "i") };
      }

      const courses = await this._courseRepository.getAllCoursesByInstructor(query, page, limit);

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

  async getAllActiveCourses(
    page: number,
    limit: number,
    search?: string,
    filters?: { level?: string; pricingType?: string },
    sort?: { field: string; order: string }
  ): Promise<IResponse> {
    try {
      const query: any = {
        isPublished: true,
        isBlocked: false,
      };

      if (search) {
        query.title = { $regex: new RegExp(search, "i") };
      }

      if (filters?.level) {
        query.level = filters.level;
      }
      if (filters?.pricingType) {
        query["pricing.type"] = filters.pricingType;
      }

      const sortQuery: any = {};
      if (sort) {
        switch (sort.field) {
          case "price":
            sortQuery["pricing.amount"] = sort.order === "asc" ? 1 : -1;
            break;
          case "updatedAt":
            sortQuery.updatedAt = sort.order === "asc" ? 1 : -1;
            break;
          case "studentsEnrolled":
            sortQuery.studentsEnrolled = sort.order === "asc" ? 1 : -1;
            break;
          default:
            sortQuery.updatedAt = -1;
        }
      } else {
        sortQuery.updatedAt = -1;
      }

      const courses = await this._courseRepository.getAllActiveCourses(query, page, limit, sortQuery);
      const totalCourses = await this._courseRepository.countDocuments(query);

      return {
        success: true,
        message: "Active courses fetched successfully.",
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
        message: "An error occurred while fetching active courses.",
        error: { message: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  async getCourseById(courseId: string): Promise<IResponse> {
    try {
      const course = await this._courseRepository.getCourseById(courseId);

      if (!course) {
        return {
          success: false,
          message: "Course not found.",
        };
      }

      return {
        success: true,
        message: "Course fetched successfully.",
        data: course,
      };
    } catch (error) {
      return {
        success: false,
        message: "An error occurred while fetching the course.",
        error: {
          message: error instanceof Error ? error.message : "Unknown error"
        },
      };
    }
  }

  async getCourseByInstructor(courseId: string, instructorId: string): Promise<IResponse> {
    try {
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        return {
          success: false,
          message: "Valid Course ID is required.",
          error: { message: "Invalid course ID." },
        };
      }

      if (!instructorId || !Types.ObjectId.isValid(instructorId)) {
        return {
          success: false,
          message: "Valid Instructor ID is required.",
          error: { message: "Invalid instructor ID." }
        };
      }

      const course = await this._courseRepository.getCourseByInstructor(courseId, instructorId);

      if (!course) {
        return {
          success: false,
          message: "Course not found or you are not authorized to access this course.",
          error: { message: "Course not found." },
        };
      }

      return {
        success: true,
        message: "Course fetched successfully.",
        data: course,
      };
    } catch (error) {
      return {
        success: false,
        message: "An error occurred while fetching the course.",
        error: {
          message: error instanceof Error ? error.message : "Unknown error",

        },
      };
    }
  }

  async editCourse(
    courseId: string,
    instructorId: string,
    updateData: Partial<ICourse>
  ): Promise<IResponse> {
    try {
      if (!courseId || !instructorId) {
        return {
          success: false,
          message: "Course ID and Instructor ID are required.",
        };
      }

      const title = updateData.title;
      if (title) {
        const existingCourse = await this._courseRepository.findByTitleAndInstructor(
          title,
          new Types.ObjectId(instructorId)
        );

        if (existingCourse && existingCourse._id && existingCourse._id.toString() !== courseId) {
          return {
            success: false,
            message: "A course with this title already exists"
          };
        }
      }

      const updatedCourse = await this._courseRepository.editCourse(
        courseId,
        instructorId,
        updateData
      );

      if (!updatedCourse) {
        return {
          success: false,
          message: "Course not found or you are not authorized to edit this course.",
        };
      }

      return {
        success: true,
        message: "Course updated successfully.",
        data: updatedCourse,
      };
    } catch (error) {
      return {
        success: false,
        message: "An error occurred while updating the course.",
        error: {
          message: error instanceof Error ? error.message : "Unknown error"
        },
      };
    }
  }
}





export default CourseService;