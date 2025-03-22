import { Types } from "mongoose";
import { CourseRepository } from "../repositories/courseRepository";
import { ICategoryRepository } from "../interfaces/IRepositories";
import { IResponse } from "../interfaces/IResponse";
import { ICourseService } from "../interfaces/IServices";
import { ICourse, ITrial, ILesson, IModule } from "../interfaces/ICourse";
import { CategoryDoc } from "../interfaces/ICategory";
import { CustomError } from "../utils/CustomError";
import { ICourseRepository } from "../interfaces/IRepositories";
import { s3 } from "../config/s3Config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";





export class CourseService implements ICourseService {
  private _courseRepository: ICourseRepository;
  private _categoryRepository: ICategoryRepository;

  constructor(courseRepository: CourseRepository, categoryRepository: ICategoryRepository) {
    this._courseRepository = courseRepository;
    this._categoryRepository = categoryRepository;
  }

  async createCourse(courseData: Partial<ICourse>): Promise<IResponse> {
    try {
      // Validate required fields
      const requiredFields: (keyof ICourse)[] = [
        "title",
        "description",
        "thumbnail",
        "instructorRef",
        "categoryRef",
        "language",
        "level",
      ];
      for (const field of requiredFields) {
        if (!courseData[field]) {
          throw new CustomError(`${field} is required.`, 400, field);
        }
      }

      const trimmedTitle = courseData.title!.trim();
      if (!trimmedTitle) {
        throw new CustomError("Course title cannot be empty.", 400, "title");
      }

      // Validate categoryRef
      const categoryRefString = courseData.categoryRef as unknown as string; // Convert to string safely
      if (!Types.ObjectId.isValid(categoryRefString)) {
        throw new CustomError("Invalid category ID.", 400, "categoryRef");
      }

      // Convert the string to an ObjectId
      const categoryRef = new Types.ObjectId(categoryRefString);
      const category = await this._categoryRepository.findById(categoryRefString);
      if (!category) {
        throw new CustomError("Category not found.", 404, "categoryRef");
      }

      // Validate pricing
      if (!courseData.pricing || !["free", "paid"].includes(courseData.pricing.type)) {
        throw new CustomError("Pricing type must be 'free' or 'paid'.", 400, "pricing.type");
      }
      if (courseData.pricing.type === "paid" && (!courseData.pricing.amount || courseData.pricing.amount <= 0)) {
        throw new CustomError("Amount must be greater than 0 for paid courses.", 400, "pricing.amount");
      }

      // Validate modules and lessons
      if (!courseData.modules || !Array.isArray(courseData.modules) || courseData.modules.length === 0) {
        throw new CustomError("At least one module is required.", 400, "modules");
      }

      for (let i = 0; i < courseData.modules.length; i++) {
        const module = courseData.modules[i];
        if (!module.moduleTitle?.trim()) {
          throw new CustomError(`Module ${i + 1} title is required.`, 400, `modules[${i}].moduleTitle`);
        }

        if (!module.lessons || !Array.isArray(module.lessons) || module.lessons.length === 0) {
          throw new CustomError(`Module ${i + 1} must have at least one lesson.`, 400, `modules[${i}].lessons`);
        }

        for (let j = 0; j < module.lessons.length; j++) {
          const lesson = module.lessons[j];
          const lessonFields: (keyof ILesson)[] = ["lessonNumber", "title", "description", "video", "objectives"];
          for (const field of lessonFields) {
            if (!lesson[field]) {
              throw new CustomError(`Lesson ${j + 1} ${field} is required in Module ${i + 1}.`, 400, `modules[${i}].lessons[${j}].${field}`);
            }
          }
          if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
            throw new CustomError(`Lesson ${j + 1} must have at least one objective in Module ${i + 1}.`, 400, `modules[${i}].lessons[${j}].objectives`);
          }
        }
      }

      // Check for duplicate course
      const existingCourse = await this._courseRepository.findByTitleAndInstructor(trimmedTitle, courseData.instructorRef as Types.ObjectId);
      if (existingCourse) {
        return {
          success: false,
          message: "A course with this title already exists for this instructor.",
        };
      }

      // Default trial object that satisfies ITrial (non-optional)
      const defaultTrial: ITrial = {
        video: courseData.trial?.video || undefined,
      } as ITrial;

      // Set default values and create the course
      const newCourse = await this._courseRepository.createCourse({
        ...courseData,
        title: trimmedTitle,
        categoryRef, // Use the converted ObjectId
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
      console.error("Error creating course:", error);
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

//   async refreshPresignedUrls(courseId: string): Promise<IResponse> {
//     try {
//       const course = await this._courseRepository.findById(courseId);
//       if (!course) {
//         throw new CustomError("Course not found.", 404, "courseId");
//       }

//       const thumbnailKeyMatch = course.thumbnail.match(/courses\/[^?]+/);
//       if (!thumbnailKeyMatch) {
//         throw new CustomError("Invalid thumbnail URL format.", 400, "thumbnail");
//       }
//       const thumbnailKey = thumbnailKeyMatch[0];

//       const thumbnailUrl = await getSignedUrl(
//         s3,
//         new GetObjectCommand({
//           Bucket: process.env.BUCKET_NAME!,
//           Key: thumbnailKey,
//         }),
//         { expiresIn: 60 * 60 * 24 }
//       );

//       const updatedModules: IModule[] = await Promise.all(
//         course.modules.map(async (module: IModule) => {
//           const updatedLessons: ILesson[] = await Promise.all(
//             module.lessons.map(async (lesson: ILesson) => {
//               const videoKeyMatch = lesson.video.match(/courses\/[^?]+/);
//               if (!videoKeyMatch) {
//                 throw new CustomError(`Invalid video URL format for lesson ${lesson.lessonNumber}.`, 400, "video");
//               }
//               const videoKey = videoKeyMatch[0];

//               const videoUrl = await getSignedUrl(
//                 s3,
//                 new GetObjectCommand({
//                   Bucket: process.env.BUCKET_NAME!,
//                   Key: videoKey,
//                 }),
//                 { expiresIn: 60 * 60 * 24 }
//               );

//               return {
//                 ...lesson,
//                 video: videoUrl,
//               } as ILesson;
//             })
//           );

//           return {
//             ...module,
//             lessons: updatedLessons,
//           } as IModule;
//         })
//       );

//       const updatedCourse = await this._courseRepository.updateCourse(courseId, {
//         thumbnail: thumbnailUrl,
//         modules: updatedModules,
//         updatedAt: new Date(),
//       });

//       return {
//         success: true,
//         message: "Presigned URLs refreshed successfully.",
//         data: updatedCourse,
//       };
//     } catch (error) {
//       console.error("Error refreshing presigned URLs:", error);
//       if (error instanceof CustomError) {
//         return {
//           success: false,
//           message: error.message,
//           error: {
//             message: error.message,
//             field: error.field,
//             statusCode: error.statusCode,
//           },
//         };
//       }
//       return {
//         success: false,
//         message: "An error occurred while refreshing presigned URLs.",
//         error: { message: error instanceof Error ? error.message : "Unknown error" },
//       };
//     }
//   }

}

export default CourseService;