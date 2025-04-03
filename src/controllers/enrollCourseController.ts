import { Request, Response } from "express";
import EnrollCourseService from "../services/enrollmentServices";
import { Status } from "../utils/enums";
import { verifyAccessToken } from "../utils/jwt";
import { IEnrollCourseService } from "../interfaces/IServices";

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
      res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
    } catch (error) {
      console.error("Error fetching enrollments by user ID:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
  
}


export default EnrollCourseController;