import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Request, Response } from "express";
import { ICourseService, IEnrollCourseService } from "../interfaces/IServices";
import { Status } from "../utils/enums";
import { AuthRequest } from "../interfaces/AuthRequest";
import { Types } from "mongoose";
import { ICourse, IModule, ILesson, FilterOptions, SortOptions, ICourseUpdate } from "../interfaces/ICourse";
import { ILessonDTO, IModuleDTO } from "../interfaces/ICourseDTO";
import { s3Service } from "../services/s3Service";
import { ILessonData, IModuleData, IUpdate } from "../interfaces/ILessonData";



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
      const existingCourseResponse = await this._courseService.getCourseById(courseId);
      if (!existingCourseResponse.success || !existingCourseResponse.data) {
        res.status(Status.NOT_FOUND).json({
          success: false,
          message: "Course not found.",
        });
        return;
      }
      const existingCourse = existingCourseResponse.data as ICourse;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const thumbnailFile = files?.thumbnail?.[0];
      const videoFiles = files?.videos || [];

      const rawUpdateData = req.body.courseData ? JSON.parse(req.body.courseData) : {};

      console.log('editCourse incoming data:', {
        courseId,
        instructorId,
        rawUpdateData: JSON.stringify(rawUpdateData, null, 2),
        thumbnailFile: thumbnailFile ? thumbnailFile.originalname : null,
        videoFilesCount: videoFiles.length,
        videoFiles: videoFiles.map(f => f.originalname),
      });

      const updateData: ICourseUpdate = {};

      // Populate scalar fields
      if (rawUpdateData.title) updateData.title = rawUpdateData.title;
      if (rawUpdateData.description) updateData.description = rawUpdateData.description;
      if (rawUpdateData.language) updateData.language = rawUpdateData.language;
      if (rawUpdateData.level) updateData.level = rawUpdateData.level;
      if (rawUpdateData.pricing) updateData.pricing = rawUpdateData.pricing;
      if (rawUpdateData.isRequested !== undefined) updateData.isRequested = rawUpdateData.isRequested;
      if (rawUpdateData.isPublished !== undefined) updateData.isPublished = rawUpdateData.isPublished;

      // Handle instructorRef
      if (typeof rawUpdateData.instructorRef === 'string' && Types.ObjectId.isValid(rawUpdateData.instructorRef)) {
        updateData.instructorRef = new Types.ObjectId(rawUpdateData.instructorRef);
      } else if (rawUpdateData.instructorRef?._id && Types.ObjectId.isValid(rawUpdateData.instructorRef._id)) {
        updateData.instructorRef = new Types.ObjectId(rawUpdateData.instructorRef._id);
      }

      // Handle categoryRef
      if (typeof rawUpdateData.categoryRef === 'string' && Types.ObjectId.isValid(rawUpdateData.categoryRef)) {
        updateData.categoryRef = new Types.ObjectId(rawUpdateData.categoryRef);
      } else if (rawUpdateData.categoryRef?._id && Types.ObjectId.isValid(rawUpdateData.categoryRef._id)) {
        updateData.categoryRef = new Types.ObjectId(rawUpdateData.categoryRef._id);
      }

      // Handle thumbnail upload
      if (thumbnailFile) {
        const thumbnailKey = `courses/${instructorId}/${updateData.title || rawUpdateData.title || existingCourse.title}/thumbnail-${Date.now()}.${thumbnailFile.mimetype.split("/")[1]}`;
        console.log("Uploading thumbnail to S3 with key:", thumbnailKey);
        await s3Service.uploadFile(thumbnailKey, thumbnailFile.buffer, thumbnailFile.mimetype);
        updateData.thumbnail = thumbnailKey;
      } else if (rawUpdateData.thumbnail && !rawUpdateData.thumbnail.startsWith("http")) {
        updateData.thumbnail = rawUpdateData.thumbnail;
      }

      // Handle modules and lessons
      if (rawUpdateData.modules) {
        // Parse video mapping
        const videoMap: Map<string, number> = new Map();
        if (videoFiles.length > 0 && req.body.videoMapping) {
          try {
            const videoMapping = JSON.parse(req.body.videoMapping);
            Object.entries(videoMapping).forEach(([lessonKey, index]) => {
              videoMap.set(lessonKey, parseInt(index as string));
            });
          } catch (error) {
            console.error("Error parsing videoMapping:", error);
          }
        }

        // Log video mapping
        console.log('videoMap:', Array.from(videoMap.entries()));

        // Process modules and lessons
        updateData.modules = await Promise.all(
          rawUpdateData.modules.map(async (module: any, moduleIndex: number) => {
            // Log module data
            console.log(`Processing module ${moduleIndex + 1}:`, {
              moduleTitle: module.moduleTitle,
              lessonCount: module.lessons.length,
              lessons: module.lessons.map((l: any) => ({
                id: l._id,
                title: l.title,
                lessonNumber: l.lessonNumber,
                videoKey: l.videoKey || l.video,
              })),
            });

            const lessons = await Promise.all(
              module.lessons.map(async (lesson: any, lessonIndex: number) => {
                // Determine lesson identifier
                const lessonKey = lesson._id && Types.ObjectId.isValid(lesson._id)
                  ? lesson._id.toString()
                  : `new-lesson-${moduleIndex}-${lessonIndex}`;

                // Log lesson processing
                console.log(`Processing lesson ${lessonIndex + 1} in module ${moduleIndex + 1}:`, {
                  lessonKey,
                  lessonData: lesson,
                  hasVideoKey: !!lesson.videoKey,
                  hasVideo: !!lesson.video,
                });

                // Find the existing lesson (if it exists) to preserve the video field
                let existingVideoKey: string | undefined;
                if (lesson._id && Types.ObjectId.isValid(lesson._id)) {
                  const existingModule = existingCourse.modules[moduleIndex];
                  if (existingModule) {
                    const existingLesson = existingModule.lessons.find(
                      (l) => l._id.toString() === lesson._id.toString()
                    );
                    existingVideoKey = existingLesson?.video;
                    console.log(`Existing lesson found for ${lessonKey}:`, {
                      existingVideoKey,
                      existingLesson: existingLesson ? {
                        id: existingLesson._id,
                        title: existingLesson.title,
                        video: existingLesson.video,
                      } : null,
                    });
                  }
                }

                // Get existing video information from incoming data
                let videoKey = lesson.videoKey || lesson.video || "";
                if (videoKey && videoKey.startsWith("http")) {
                  const url = new URL(videoKey);
                  videoKey = decodeURIComponent(url.pathname.slice(1));
                } else if (videoKey) {
                  videoKey = decodeURIComponent(videoKey);
                }

                // Handle video upload if there's a new video for this lesson
                if (videoMap.has(lessonKey)) {
                  const videoIndex = videoMap.get(lessonKey)!;
                  if (videoIndex >= 0 && videoIndex < videoFiles.length) {
                    const videoFile = videoFiles[videoIndex];
                    const newVideoKey = `courses/${instructorId}/${updateData.title || rawUpdateData.title || existingCourse.title}/module-${moduleIndex + 1}/lesson-${lessonIndex + 1}-${Date.now()}.${videoFile.mimetype.split("/")[1]}`;
                    console.log(`Uploading video for lesson ${lessonKey} to S3 with key: ${newVideoKey}`);
                    await s3Service.uploadFile(newVideoKey, videoFile.buffer, videoFile.mimetype);
                    videoKey = newVideoKey;
                  } else {
                    console.warn(`Invalid video index for lesson ${lessonKey}:`, {
                      videoIndex,
                      videoFilesCount: videoFiles.length,
                    });
                  }
                }

                // Use existing video key if no new video is provided and no videoKey is in the incoming data
                if (!videoKey && existingVideoKey) {
                  videoKey = existingVideoKey;
                  console.log(`Falling back to existing videoKey for lesson ${lessonKey}:`, videoKey);
                }

                // Validate that videoKey is not empty
                if (!videoKey) {
                  console.error(`Video validation failed for lesson ${lessonIndex + 1} in module ${moduleIndex + 1}:`, {
                    lessonKey,
                    incomingVideoKey: lesson.videoKey,
                    incomingVideo: lesson.video,
                    existingVideoKey,
                    videoMapHasKey: videoMap.has(lessonKey),
                    videoMapIndex: videoMap.get(lessonKey),
                  });
                  throw new Error(`Video is required for lesson ${lessonIndex + 1} in module ${moduleIndex + 1}`);
                }

                // Create sanitized lesson object
                const sanitizedLesson: ILessonData = {
                  lessonNumber: lesson.lessonNumber,
                  title: lesson.title,
                  description: lesson.description,
                  video: videoKey,
                  videoKey: videoKey,
                  duration: lesson.duration,
                  objectives: lesson.objectives,
                  _id: lesson._id && Types.ObjectId.isValid(lesson._id) ? lesson._id.toString() : undefined,
                };

                // Log sanitized lesson
                console.log(`Sanitized lesson ${lessonKey}:`, sanitizedLesson);

                return sanitizedLesson;
              })
            );

            // Return sanitized module
            const sanitizedModule: IModuleData = {
              moduleTitle: module.moduleTitle,
              lessons: lessons,
              _id: module._id && Types.ObjectId.isValid(module._id) ? module._id.toString() : undefined,
            };

            return sanitizedModule;
          })
        );
      }

      // Log final updateData
      console.log('Final updateData:', JSON.stringify(updateData, null, 2));

      // Update the course
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

      // Step 1: Get file metadata to determine size
      const metadata = await s3Service.getObject(videoKey, true);
      if (!metadata.ContentLength) {
        res.status(Status.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Unable to determine video size for key: ${videoKey}`,
        });
        return;
      }

      const fileSize = metadata.ContentLength;
      const contentType = metadata.ContentType || "video/mp4";

      // Step 2: Parse range header
      const range = req.headers.range;

      // If no range request, return a 200 with a chunk of the beginning of the video
      if (!range) {
        // For initial requests without range, send a small chunk (e.g., first 1MB)
        const INITIAL_CHUNK_SIZE = 1024 * 1024; // 1MB
        const endByte = Math.min(INITIAL_CHUNK_SIZE - 1, fileSize - 1);

        const { Body } = await s3Service.getObject(videoKey, false, `bytes=0-${endByte}`);

        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": endByte + 1,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year
          "Content-Range": `bytes 0-${endByte}/${fileSize}`
        });

        if (Body) Body.pipe(res);
        return;
      }

      // Step 3: Parse the range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);

      // If end is not specified, set chunk size to 1MB or remaining file size
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

      // Ensure end doesn't exceed file size
      end = Math.min(end, fileSize - 1);

      // Calculate content length
      const contentLength = end - start + 1;

      // Step 4: Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set({
          "Content-Range": `bytes */${fileSize}`
        }).end();
        return;
      }

      // Step 5: Get and stream the specific range
      const { Body } = await s3Service.getObject(videoKey, false, `bytes=${start}-${end}`);

      if (!Body) {
        res.status(Status.NOT_FOUND).json({
          success: false,
          message: `Video chunk not found for key: ${videoKey}`,
        });
        return;
      }

      // Step 6: Set response headers for partial content
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000" // Cache chunks for 1 year
      });

      // Step 7: Pipe the stream to response
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