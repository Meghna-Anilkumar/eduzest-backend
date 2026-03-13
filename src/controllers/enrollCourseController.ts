import { Request, Response } from "express";
import EnrollCourseService from "../services/enrollmentServices";
import { Status } from "../utils/enums";
import { verifyAccessToken } from "../utils/jwt";
import { IEnrollCourseService } from "../interfaces/IServices";
import { s3Service } from "../services/s3Service";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";
import { PopulatedEnrollmentDoc,EnrollmentWithSignedUrls } from "../models/enrollmentModel";
import { AuthRequest } from "../interfaces/AuthRequest";

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
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
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
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

async getEnrollmentsByUserId(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.cookies.userJWT ? verifyAccessToken(req.cookies.userJWT).id : null;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || undefined;

    if (!userId) {
      res.status(Status.UN_AUTHORISED).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const result = await this.enrollCourseService.getEnrollmentsByUserId(userId, page, limit, search);

    if (result.success && result.data) {
      const enrollmentData = result.data as {
        enrollments: PopulatedEnrollmentDoc[];
        totalPages: number;
        currentPage: number;
        totalEnrollments: number;
      };

      if (Array.isArray(enrollmentData.enrollments)) {
        const enrollmentsWithSignedUrls: EnrollmentWithSignedUrls[] = await Promise.all(
          enrollmentData.enrollments.map(async (enrollment) => {
            // Check if enrollment has toObject method (is a Mongoose document)
            const enrollmentObj = typeof enrollment.toObject === 'function' 
              ? enrollment.toObject() 
              : enrollment;

            // Create a new object with the transformed courseId
            const transformedEnrollment: EnrollmentWithSignedUrls = {
              ...enrollmentObj,
              courseId: null
            };

            // Check if courseId exists and is a populated course object
            if (enrollmentObj.courseId && typeof enrollmentObj.courseId === 'object' && 'title' in enrollmentObj.courseId) {
              transformedEnrollment.courseId = await s3Service.addSignedUrlsToCourse(enrollmentObj.courseId);
            }

            return transformedEnrollment;
          })
        );

        // Update the result data with transformed enrollments
        result.data = {
          ...enrollmentData,
          enrollments: enrollmentsWithSignedUrls
        };
      }
    }

    res.status(result.success ? Status.OK : Status.BAD_REQUEST).json(result);
  } catch (error) {
    console.error("Error fetching enrollments by user ID:", error);
    res.status(Status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
    });
  }
}

  async updateLessonProgress(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, lessonId, progress } = req.body;
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
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
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
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getInstructorCourseStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;

      if (!userId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const result = await this.enrollCourseService.getInstructorCourseStats(userId);
      res.status(Status.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching instructor course stats:", error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

}


export default EnrollCourseController;