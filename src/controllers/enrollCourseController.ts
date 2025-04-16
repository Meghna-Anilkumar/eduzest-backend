import { Request, Response } from "express";
import EnrollCourseService from "../services/enrollmentServices";
import { Status } from "../utils/enums";
import { verifyAccessToken } from "../utils/jwt";
import { IEnrollCourseService } from "../interfaces/IServices";
import { s3Service } from "../services/s3Service";
import { ICourse } from "../interfaces/ICourse";

class EnrollCourseController {
  private enrollCourseService: IEnrollCourseService;

  constructor(enrollCourseService: EnrollCourseService) {
    this.enrollCourseService = enrollCourseService;
  }


  async enrollFreeCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.body;
      const userId = req.cookies.userJWT ? verifyAccessToken(req.cookies.userJWT).id : null;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      if (!courseId) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID is required",
        });
        return;
      }

      const result = await this.enrollCourseService.enrollFreeCourse(userId, courseId);
      res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
    } catch (error) {
      console.error("Error enrolling user in free course:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }


  async checkEnrollment(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.cookies.userJWT ? verifyAccessToken(req.cookies.userJWT).id : null;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      if (!courseId) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID is required",
        });
        return;
      }

      const result = await this.enrollCourseService.checkEnrollment(userId, courseId);
      res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
    } catch (error) {
      console.error("Error checking enrollment:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }

  async getEnrollmentsByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.cookies.userJWT ? verifyAccessToken(req.cookies.userJWT).id : null;
  
      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }
  
      const result = await this.enrollCourseService.getEnrollmentsByUserId(userId);
      console.log("Raw enrollments data:", JSON.stringify(result.data, null, 2));
  
      // Add signed URLs to course content in enrollments
      if (result.success && result.data && Array.isArray(result.data)) {
        const enrollmentsWithSignedUrls = await Promise.all(
          result.data.map(async (enrollment) => {
            if (enrollment.courseId) {
              console.log("Transforming courseId:", JSON.stringify(enrollment.courseId, null, 2));
              enrollment.courseId = await s3Service.addSignedUrlsToCourse(enrollment.courseId as ICourse);
            } else {
              console.log("No courseId found in enrollment:", JSON.stringify(enrollment, null, 2));
            }
            return enrollment;
          })
        );
  
        result.data = enrollmentsWithSignedUrls;
      } else {
        console.log("Result data is not an array or is empty:", result);
      }
  
      res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
    } catch (error) {
      console.error("Error fetching enrollments by user ID:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }


  async updateLessonProgress(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, lessonId, progress } = req.body;
      console.log(req.body,'progreeeeeeeeeeesssssssssssssssss')
      const userId = req.cookies.userJWT ? verifyAccessToken(req.cookies.userJWT).id : null;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      if (!courseId || !lessonId || progress === undefined) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID, lesson ID, and progress are required",
        });
        return;
      }

      const result = await this.enrollCourseService.updateLessonProgress(userId, courseId, lessonId, progress);
      res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }

  async getLessonProgress(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.cookies.userJWT ? verifyAccessToken(req.cookies.userJWT).id : null;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      if (!courseId) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: "Course ID is required",
        });
        return;
      }

      const result = await this.enrollCourseService.getLessonProgress(userId, courseId);
      res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
}


export default EnrollCourseController;