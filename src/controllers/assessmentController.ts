import { Response } from 'express';
import { AuthRequest } from '../interfaces/AuthRequest';
import { IAssessmentService } from '../interfaces/IServices';
import { Status } from '../utils/enums';
import { IAssessment } from '../interfaces/IAssessments';
import { Types } from 'mongoose';
import { MESSAGE_CONSTANTS } from '../constants/message_constants';

class AssessmentController {
  constructor(private _assessmentService: IAssessmentService) { }

  async createAssessment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: 'Instructor ID not found in token.',
        });
        return;
      }

      const { courseId, moduleTitle } = req.params;
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Course ID is required.',
        });
        return;
      }
      if (!moduleTitle) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Module title is required.',
        });
        return;
      }

      const assessmentData: Partial<IAssessment> = req.body;

      const response = await this._assessmentService.createAssessment(
        courseId,
        decodeURIComponent(moduleTitle),
        instructorId,
        assessmentData
      );

      res.status(response.success ? Status.CREATED : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in createAssessment controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message :MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getAssessmentsByCourseAndModule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { courseId, moduleTitle } = req.params;
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Course ID is required.',
        });
        return;
      }
      if (!moduleTitle) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Module title is required.',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;

      const response = await this._assessmentService.getAssessmentsByCourseAndModule(
        courseId,
        decodeURIComponent(moduleTitle),
        instructorId,
        page,
        limit
      );

      res.status(Status.OK).json(response);
    } catch (error) {
      console.error('Error in getAssessmentsByCourseAndModule controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getAssessmentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: 'Instructor ID not found in token.',
        });
        return;
      }

      const { assessmentId } = req.params;
      if (!assessmentId || !Types.ObjectId.isValid(assessmentId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Assessment ID is required.',
        });
        return;
      }

      const response = await this._assessmentService.getAssessmentById(assessmentId, instructorId);

      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getAssessmentById controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }



  async updateAssessment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message:MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { assessmentId } = req.params;
      if (!assessmentId || !Types.ObjectId.isValid(assessmentId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Assessment ID is required.',
        });
        return;
      }

      const updateData: Partial<IAssessment> = req.body;

      const response = await this._assessmentService.updateAssessment(assessmentId, instructorId, updateData);

      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in updateAssessment controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async deleteAssessment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { assessmentId } = req.params;
      if (!assessmentId || !Types.ObjectId.isValid(assessmentId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Assessment ID is required.',
        });
        return;
      }

      const response = await this._assessmentService.deleteAssessment(assessmentId, instructorId);

      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in deleteAssessment controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message :MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getAssessmentsForStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { courseId, moduleTitle } = req.params;
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Course ID is required.',
        });
        return;
      }
      if (!moduleTitle) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Module title is required.',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;

      const response = await this._assessmentService.getAssessmentsForStudent(
        courseId,
        decodeURIComponent(moduleTitle),
        studentId,
        page,
        limit
      );

      res.status(Status.OK).json(response);
    } catch (error) {
      console.error('Error in getAssessmentsForStudent controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async submitAssessment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message:MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { assessmentId } = req.params;
      if (!assessmentId || !Types.ObjectId.isValid(assessmentId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Assessment ID is required.',
        });
        return;
      }

      const { answers } = req.body;
      if (!answers || !Array.isArray(answers)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Answers must be provided as an array.',
        });
        return;
      }

      const response = await this._assessmentService.submitAssessment(assessmentId, studentId, answers);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in submitAssessment controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message :MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getAssessmentResult(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message:MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { assessmentId } = req.params;
      if (!assessmentId || !Types.ObjectId.isValid(assessmentId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Assessment ID is required.',
        });
        return;
      }

      const response = await this._assessmentService.getAssessmentResult(assessmentId, studentId);
      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getAssessmentResult controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message :MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getAssessmentByIdForStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { assessmentId } = req.params;
      if (!assessmentId || !Types.ObjectId.isValid(assessmentId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Assessment ID is required.',
        });
        return;
      }

      // Assuming you have or will add this method to your service interface
      const response = await this._assessmentService.getAssessmentByIdForStudent(assessmentId, studentId);

      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getAssessmentByIdForStudent controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }


  async getCourseProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message:MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { courseId } = req.params;
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Course ID is required.',
        });
        return;
      }

      const response = await this._assessmentService.getCourseProgress(courseId, studentId);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in getCourseProgress controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message :MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getAllAssessmentsForCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED
        });
        return;
      }

      const { courseId } = req.params;
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Course ID is required.',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;

      const response = await this._assessmentService.getAllAssessmentsForCourse(
        courseId,
        studentId,
        page,
        limit
      );

      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in getAllAssessmentsForCourse controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }


}

export default AssessmentController;