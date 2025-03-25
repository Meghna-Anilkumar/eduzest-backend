import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Request, Response } from "express";
import { ICourseService } from "../interfaces/IServices";
import { Status } from "../utils/enums";
import { AuthRequest } from "../interfaces/AuthRequest";
import { s3 } from "../config/s3Config";
import { Types } from "mongoose";
import { ICourse, IModule, ILesson } from "../interfaces/ICourse";

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
      const thumbnailCommand = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: thumbnailKey,
        Body: thumbnailFile.buffer,
        ContentType: thumbnailFile.mimetype,
      });
      await s3.send(thumbnailCommand);

      const thumbnailUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME!,
          Key: thumbnailKey,
        }),
        { expiresIn: 60 * 60 * 24 }
      );

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
              const videoCommand = new PutObjectCommand({
                Bucket: process.env.BUCKET_NAME!,
                Key: videoKey,
                Body: videoFile.buffer,
                ContentType: videoFile.mimetype,
              });
              await s3.send(videoCommand);

              const videoUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({
                  Bucket: process.env.BUCKET_NAME!,
                  Key: videoKey,
                }),
                { expiresIn:3600 * 24 * 7  }
              );

              return {
                ...lesson,
                video: videoUrl,
              } as ILesson;
            })
          );

          return {
            ...module,
            lessons,
          } as IModule;
        })
      );

      const fullCourseData: Partial<ICourse> = {
        ...courseData,
        thumbnail: thumbnailUrl,
        modules,
      };

      const response = await this._courseService.createCourse(fullCourseData);

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

      const response = await this._courseService.getAllCoursesByInstructor(
        instructorId,
        page,
        limit,
        search
      );
      res.status(Status.OK).json(response);
    } catch (error) {
      console.error("Error in getAllCourses controller:", error);
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

      const response = await this._courseService.getAllActiveCourses(page, limit, search);
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
  
      if (!response.success) {
        res.status(response.error?.statusCode || Status.NOT_FOUND).json(response);
        return;
      }
  
      res.status(Status.OK).json(response);
    } catch (error) {
      console.error("Error in getCourseById controller:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error.",
      });
    }
  }



}

export default CourseController;