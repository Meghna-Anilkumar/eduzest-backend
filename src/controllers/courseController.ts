import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Request, Response } from "express";
import { ICourseService, IEnrollCourseService } from "../interfaces/IServices";
import { Status } from "../utils/enums";
import { AuthRequest } from "../interfaces/AuthRequest";
import { Types } from "mongoose";
import { ICourse, IModule, ILesson, FilterOptions, SortOptions, ICourseUpdate } from "../interfaces/ICourse";
import { ILessonDTO,IModuleDTO } from "../interfaces/ICourseDTO";
import { s3Service } from "../services/s3Service";



class CourseController {
  constructor(private _courseService: ICourseService,
    private _enrollmentService: IEnrollCourseService) { }

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

  async getCourseByInstructor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      const courseId = req.params.id;

      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "Instructor ID not found in token.",
        });
        return;
      }

      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Valid Course ID is required.",
        });
        return;
      }

      const response = await this._courseService.getCourseByInstructor(courseId, instructorId);

      if (!response.success || !response.data) {
        res.status(response.error?.statusCode || Status.NOT_FOUND).json(response);
        return;
      }

      const courseWithSignedUrls = await s3Service.addSignedUrlsToCourse(response.data as ICourse);
      response.data = courseWithSignedUrls;

      res.status(Status.OK).json(response);
    } catch (error) {
      console.error("Error in getCourseByInstructor controller:", error);
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
        // Create a map to track which videos are associated with which lesson
        const videoMap: Map<string, number> = new Map();
        
        // First parse the incoming data to identify which lessons need new videos
        if (videoFiles.length > 0 && req.body.videoMapping) {
          // Parse the mapping of videos to lesson positions
          try {
            const videoMapping = JSON.parse(req.body.videoMapping);
            Object.entries(videoMapping).forEach(([index, lessonIdentifier]) => {
              videoMap.set(lessonIdentifier as string, parseInt(index));
            });
          } catch (error) {
            console.error("Error parsing video mapping:", error);
          }
        }
  
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
          modules = await Promise.all(
            modules.map(async (module: IModule, moduleIndex: number) => {
              const lessons: ILesson[] = await Promise.all(
                module.lessons.map(async (lesson: ILesson, lessonIndex: number) => {
                  // Create a unique identifier for this lesson
                  const lessonIdentifier = `${moduleIndex}-${lessonIndex}`;
                  
                  // Check if this lesson has a new video assigned in the mapping
                  if (videoMap.has(lessonIdentifier)) {
                    const videoIndex = videoMap.get(lessonIdentifier)!;
                    
                    if (videoIndex >= 0 && videoIndex < videoFiles.length) {
                      const videoFile = videoFiles[videoIndex];
                      // Create a unique key for this video using both module and lesson indices
                      const videoKey = `courses/${instructorId}/${updateData.title || rawUpdateData.title || "course"}/module-${moduleIndex + 1}/lesson-${lessonIndex + 1}-${Date.now()}.${videoFile.mimetype.split("/")[1]}`;
                      await s3Service.uploadFile(videoKey, videoFile.buffer, videoFile.mimetype);
                      return { ...lesson, video: videoKey } as ILesson;
                    }
                  } else if (!lesson.video || lesson.video === "") {
                    // Fallback to the old behavior if no mapping is provided
                    // This is mainly for backward compatibility
                    const availableVideoIndex = 0; // Use first available video
                    if (availableVideoIndex < videoFiles.length) {
                      const videoFile = videoFiles[availableVideoIndex];
                      // Add timestamp to ensure uniqueness
                      const videoKey = `courses/${instructorId}/${updateData.title || rawUpdateData.title || "course"}/module-${moduleIndex + 1}/lesson-${lessonIndex + 1}-${Date.now()}.${videoFile.mimetype.split("/")[1]}`;
                      await s3Service.uploadFile(videoKey, videoFile.buffer, videoFile.mimetype);
                      return { ...lesson, video: videoKey } as ILesson;
                    }
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


  async streamVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const courseId = req.params.courseId;
      let videoKey = req.query.videoKey as string;
  
      console.log("streamVideo request:", { userId, courseId, videoKey });
  
      if (!userId || !courseId || !videoKey) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "User ID, course ID, and video key are required.",
        });
        return;
      }
  
      videoKey = decodeURIComponent(videoKey).replace(/[^a-zA-Z0-9\s\/._-]/g, "");
      console.log("Sanitized videoKey:", videoKey);
      if (!videoKey.startsWith(`courses/`)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Invalid video key.",
        });
        return;
      }
  
      // Verify enrollment
      // const isEnrolled = await this._enrollmentService.checkEnrollment(userId, courseId);
      // console.log("Enrollment check result:", isEnrolled);
      // if (!isEnrolled) {
      //   res.status(Status.FORBIDDEN).json({
      //     success: false,
      //     message: "You must be enrolled to stream this video.",
      //   });
      //   return;
      // }
  
      // Handle range request
      const range = req.headers.range;
      let start = 0;
      let end: number | undefined;
      let contentLength: number | undefined;
  
      // Get object metadata using HeadObjectCommand
      const metadata = await s3Service.getObject(videoKey, true);
      if (!metadata.ContentLength) {
        res.status(Status.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Unable to determine video size for key: ${videoKey}`,
        });
        return;
      }
      const totalLength = metadata.ContentLength;
      contentLength = totalLength;
  
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
  
        if (start >= totalLength || end >= totalLength || start > end) {
          res.status(206).json({
            success: false,
            message: "Range out of bounds",
          });
          return;
        }
  
        contentLength = end - start + 1;
      }
  
      // Fetch the stream with range if specified
      const { Body, ContentType } = await s3Service.getObject(videoKey, false, range ? `bytes=${start}-${end}` : undefined);
      if (!Body) {
        res.status(Status.NOT_FOUND).json({
          success: false,
          message: `Video not found for key: ${videoKey}`,
        });
        return;
      }
  
      // Set headers
      res.setHeader("Content-Type", ContentType || "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
  
      if (range && contentLength && totalLength) {
        res.setHeader("Content-Range", `bytes ${start}-${end}/${totalLength}`);
        res.setHeader("Content-Length", contentLength);
        res.status(Status.PARTIAL_CONTENT);
      } else {
        res.setHeader("Content-Length", contentLength);
        res.status(Status.OK);
      }
  
      // Pipe the stream to response
      Body.pipe(res);
    } catch (error) {
      console.error("Error in streamVideo controller:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error.";
      if (errorMessage.includes("AccessDenied")) {
        res.status(Status.FORBIDDEN).json({
          success: false,
          message: "Access denied. Please contact support to verify your permissions.",
        });
      } else if (errorMessage.includes("NoSuchKey")) {
        res.status(Status.NOT_FOUND).json({
          success: false,
          message: `Video not found for key: ${req.query.videoKey}`,
        });
      } else {
        res.status(Status.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: errorMessage,
        });
      }
    }
  }
}

export default CourseController;