import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Request, Response } from "express";
import { ICourseService } from "../interfaces/IServices";
import { Status } from "../utils/enums";
import { AuthRequest } from "../interfaces/AuthRequest";
import { s3 } from "../config/s3Config";
import { Types } from "mongoose";
import { ICourse, IModule, ILesson, FilterOptions, SortOptions, ICourseUpdate } from "../interfaces/ICourse";
import { s3Service } from "../services/s3Service";



class CourseController {
  constructor(private _courseService: ICourseService) { }

  async createCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorRefString = req.user?.id;
      if (!instructorRefString) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "Instructor ID not found in token.",
        });
        return;
      }
      const instructorRef = new Types.ObjectId(instructorRefString);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const thumbnailFile = files?.thumbnail?.[0];
      const videoFiles = files?.videos || [];

      if (!thumbnailFile) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course thumbnail is required.",
        });
        return;
      }

      const courseData: Partial<ICourse> = JSON.parse(req.body.courseData || "{}");
      courseData.instructorRef = instructorRef;

      const thumbnailKey = `courses/${instructorRef}/${courseData.title}/thumbnail.${thumbnailFile.mimetype.split("/")[1]}`;
      await s3Service.uploadFile(thumbnailKey, thumbnailFile.buffer, thumbnailFile.mimetype);
      const thumbnailUrl = await s3Service.getSignedUrl(thumbnailKey);

      let videoIndex = 0;
      const modules: IModule[] = await Promise.all(
        (courseData.modules || []).map(async (module: IModule, moduleIndex: number) => {
          const lessons: ILesson[] = await Promise.all(
            module.lessons.map(async (lesson: ILesson, lessonIndex: number) => {
              if (videoIndex >= videoFiles.length) {
                throw new Error(`Video missing for lesson ${lessonIndex + 1} in module ${moduleIndex + 1}`);
              }
              const videoFile = videoFiles[videoIndex];
              videoIndex++;

              const videoKey = `courses/${instructorRef}/${courseData.title}/module-${moduleIndex + 1}/lesson-${lessonIndex + 1}.${videoFile.mimetype.split("/")[1]}`;
              await s3Service.uploadFile(videoKey, videoFile.buffer, videoFile.mimetype);

              return {
                ...lesson,
                video: videoKey,
              } as ILesson;
            })
          );
          return { ...module, lessons } as IModule;
        })
      );

      const fullCourseData: Partial<ICourse> = {
        ...courseData,
        thumbnail: thumbnailKey,
        modules,
      };

      const response = await this._courseService.createCourse(fullCourseData);

      if (response.success && response.data) {
        response.data = await s3Service.addSignedUrlsToCourse(response.data as ICourse);
      }

      res.status(response.success ? Status.CREATED : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error("Error in createCourse controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error.",
      });
    }
  }


  async getAllCoursesByInstructor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "Instructor ID not found in token.",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const response = await this._courseService.getAllCoursesByInstructor(instructorId, page, limit, search);
      console.log(response, 'hiiiiiiiiiiiiiiiiiiiiiiiiiiii')

      if (response.success && response.data) {
        const { courses, ...pagination } = response.data as { courses: ICourse[]; totalPages: number; currentPage: number; totalCourses: number };
        const coursesWithSignedUrls = await s3Service.addSignedUrlsToCourses(courses);
        console.log(coursesWithSignedUrls, 'yyyyyyyyyyyyyyyyyyyyyyyyyyyy')
        response.data = {
          ...pagination,
          courses: coursesWithSignedUrls,
        };
      }

      res.status(Status.OK).json(response);
    } catch (error) {
      console.error("Error in getAllCoursesByInstructor controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  async getAllActiveCourses(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const level = req.query.level as string | undefined;
      const pricingType = req.query.pricingType as string | undefined;
      const sortField = req.query.sortField as string | undefined;
      const sortOrder = req.query.sortOrder as string | undefined;

      const filters: FilterOptions = {};
      if (level) {
        if (["beginner", "intermediate", "advanced"].includes(level)) {
          filters.level = level as "beginner" | "intermediate" | "advanced";
        }
      }
      if (pricingType) {
        if (["free", "paid"].includes(pricingType)) {
          filters.pricingType = pricingType as "free" | "paid";
        }
      }

      const sort: SortOptions | undefined = sortField
        ? {
          field: sortField as "price" | "updatedAt" | "studentsEnrolled",
          order: (sortOrder as "asc" | "desc") || "desc",
        }
        : undefined;

      const response = await this._courseService.getAllActiveCourses(page, limit, search, filters, sort);

      // Add this block to include signed URLs in the response
      if (response.success && response.data) {
        const { courses, ...pagination } = response.data as { courses: ICourse[]; totalPages: number; currentPage: number; totalCourses: number };
        const coursesWithSignedUrls = await s3Service.addSignedUrlsToCourses(courses);
        response.data = {
          ...pagination,
          courses: coursesWithSignedUrls,
        };
      }

      res.status(Status.OK).json(response);
    } catch (error) {
      console.error("Error in getAllActiveCourses controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  async getCourseById(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;

      if (!courseId) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID is required.",
        });
        return;
      }

      const response = await this._courseService.getCourseById(courseId);

      if (!response.success || !response.data) {
        res.status(response.error?.statusCode || Status.NOT_FOUND).json(response);
        return;
      }

      const courseWithSignedUrls = await s3Service.addSignedUrlsToCourse(response.data as ICourse);
      response.data = courseWithSignedUrls;

      res.status(Status.OK).json(response);
    } catch (error) {
      console.error("Error in getCourseById controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error.",
      });
    }
  }


  async editCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
    
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "Instructor ID not found in token.",
        });
        return;
      }

      const courseId = req.params.id;
    
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Valid Course ID is required.",
        });
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const thumbnailFile = files?.thumbnail?.[0];
      const videoFiles = files?.videos || [];

      const rawUpdateData = req.body.courseData ? JSON.parse(req.body.courseData) : {};
      const updateData: ICourseUpdate = {};

      if (rawUpdateData.title) updateData.title = rawUpdateData.title;
      if (rawUpdateData.description) updateData.description = rawUpdateData.description;
      if (rawUpdateData.language) updateData.language = rawUpdateData.language;
      if (rawUpdateData.level) updateData.level = rawUpdateData.level;
      if (rawUpdateData.pricing) updateData.pricing = rawUpdateData.pricing;
      if (rawUpdateData.isRequested !== undefined) updateData.isRequested = rawUpdateData.isRequested;
      if (rawUpdateData.isPublished !== undefined) updateData.isPublished = rawUpdateData.isPublished;


      if (typeof rawUpdateData.instructorRef === 'string') {
        const instructorIdMatch = rawUpdateData.instructorRef.match(/'([a-fA-F0-9]{24})'/);
        if (instructorIdMatch && instructorIdMatch[1]) {
          updateData.instructorRef = new Types.ObjectId(instructorIdMatch[1]);
        } else {
          console.log("Failed to extract instructorRef ID, using as-is:", rawUpdateData.instructorRef);
        }
      } else if (rawUpdateData.instructorRef && typeof rawUpdateData.instructorRef === 'object' && '_id' in rawUpdateData.instructorRef) {
        updateData.instructorRef = new Types.ObjectId(rawUpdateData.instructorRef._id);
      }

      if (typeof rawUpdateData.categoryRef === 'string') {
        const categoryIdMatch = rawUpdateData.categoryRef.match(/'([a-fA-F0-9]{24})'/);
        if (categoryIdMatch && categoryIdMatch[1]) {
          updateData.categoryRef = new Types.ObjectId(categoryIdMatch[1]);
        } else {
          console.log("Failed to extract categoryRef ID, using as-is:", rawUpdateData.categoryRef);
        }
      } else if (rawUpdateData.categoryRef && typeof rawUpdateData.categoryRef === 'object' && '_id' in rawUpdateData.categoryRef) {
        updateData.categoryRef = new Types.ObjectId(rawUpdateData.categoryRef._id);
      }

      if (thumbnailFile) {
        const thumbnailKey = `courses/${instructorId}/${updateData.title || rawUpdateData.title || "course"}/thumbnail.${thumbnailFile.mimetype.split("/")[1]}`;
        console.log("Uploading thumbnail to S3 with key:", thumbnailKey);
        await s3Service.uploadFile(thumbnailKey, thumbnailFile.buffer, thumbnailFile.mimetype);
        updateData.thumbnail = thumbnailKey;
      } else if (!rawUpdateData.thumbnail) {
        console.log("No new thumbnail provided and no thumbnail in rawUpdateData; preserving existing value.");
      } else if (rawUpdateData.thumbnail && !rawUpdateData.thumbnail.startsWith("http")) {
        updateData.thumbnail = rawUpdateData.thumbnail;
      } else {
        console.log("Ignoring signed URL in rawUpdateData.thumbnail:", rawUpdateData.thumbnail);
      }

      if (rawUpdateData.modules) {
        let modules: IModule[] = rawUpdateData.modules.map((module: IModule) => ({
          ...module,
          lessons: module.lessons.map((lesson: ILesson) => {
            if (lesson.video && lesson.video.startsWith("http")) {
              const url = new URL(lesson.video);
              let key = url.pathname.slice(1);
              key = decodeURIComponent(key);
              return { ...lesson, video: key };
            } else if (lesson.video) {
              const decodedVideo = decodeURIComponent(lesson.video);
              return { ...lesson, video: decodedVideo };
            }
            return lesson;
          }),
        }));

        if (videoFiles.length > 0) {
          let videoIndex = 0;
          modules = await Promise.all(
            modules.map(async (module: IModule, moduleIndex: number) => {
              const lessons: ILesson[] = await Promise.all(
                module.lessons.map(async (lesson: ILesson, lessonIndex: number) => {
                  if (videoIndex < videoFiles.length && (!lesson.video || lesson.video === "")) {
                    const videoFile = videoFiles[videoIndex];
                    const videoKey = `courses/${instructorId}/${updateData.title || rawUpdateData.title || "course"}/module-${moduleIndex + 1}/lesson-${lessonIndex + 1}.${videoFile.mimetype.split("/")[1]}`;
                    await s3Service.uploadFile(videoKey, videoFile.buffer, videoFile.mimetype);
                    videoIndex++;
                    return { ...lesson, video: videoKey } as ILesson;
                  }
                  return lesson;
                })
              );
              return { ...module, lessons } as IModule;
            })
          );
        }

        updateData.modules = modules;
      }
      const response = await this._courseService.editCourse(courseId, instructorId, updateData);
      if (response.success && response.data) {
        response.data = await s3Service.addSignedUrlsToCourse(response.data as ICourse);
      }
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error("Error in editCourse controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error.",
      });
    }
  }
}

export default CourseController;