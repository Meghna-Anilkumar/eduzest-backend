import { Response } from 'express';
import { AuthRequest } from '../interfaces/AuthRequest';
import { IExamService } from '../interfaces/IServices';
import { Status } from '../utils/enums';
import { Types } from 'mongoose';
import { MESSAGE_CONSTANTS } from '../constants/message_constants';

export class ExamController {
  constructor(private _examService: IExamService) { }

  async createExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: 'Instructor ID not found in token.',
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

      const examData = req.body;
      const response = await this._examService.createExam(courseId, instructorId, examData);

      res.status(response.success ? Status.CREATED : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in createExam controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getExamsByCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
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
      const limit = parseInt(req.query.limit as string) || 5;

      const response = await this._examService.getExamsByCourse(courseId, instructorId, page, limit);
      res.status(Status.OK).json(response);
    } catch (error) {
      console.error('Error in getExamsByCourse controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getExamById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: 'Instructor ID not found in token.',
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
        });
        return;
      }

      const response = await this._examService.getExamById(examId, instructorId);
      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getExamById controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async updateExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
        });
        return;
      }

      const updateData = req.body;
      const response = await this._examService.updateExam(examId, instructorId, updateData);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in updateExam controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async deleteExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
        });
        return;
      }

      const response = await this._examService.deleteExam(examId, instructorId);
      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in deleteExam controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getExamsForStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
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
      const limit = parseInt(req.query.limit as string) || 5;

      const response = await this._examService.getExamsForStudent(courseId, studentId, page, limit);
      res.status(Status.OK).json(response);
    } catch (error) {
      console.error('Error in getExamsForStudent controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

async startExam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      res.status(Status.UN_AUTHORISED).json({
        success: false,
        message: MESSAGE_CONSTANTS.UNAUTHORIZED,
      });
      return;
    }

    const { examId } = req.params;
    if (!examId || !Types.ObjectId.isValid(examId)) {
      res.status(Status.BAD_REQUEST).json({
        success: false,
        message: 'Valid Exam ID is required.',
      });
      return;
    }

    console.log('[ExamController] Starting exam:', { examId, studentId }); // Debug log
    const response = await this._examService.startExam(examId, studentId);
    res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
  } catch (error) {
    console.error('Error in startExam controller:', error);
    res.status(Status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
    });
  }
}

  async submitExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
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

      const response = await this._examService.submitExam(examId, studentId, answers);
      res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
    } catch (error) {
      console.error('Error in submitExam controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getExamResult(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
        });
        return;
      }

      const response = await this._examService.getExamResult(examId, studentId);
      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getExamResult controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getExamByIdForStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
        });
        return;
      }

      const response = await this._examService.getExamByIdForStudent(examId, studentId);
      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getExamByIdForStudent controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async getExamProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;
      if (!studentId) {
        res.status(Status.UN_AUTHORISED).json({
          success: false,
          message: MESSAGE_CONSTANTS.UNAUTHORIZED,
        });
        return;
      }

      const { examId } = req.params;
      if (!examId || !Types.ObjectId.isValid(examId)) {
        res.status(Status.BAD_REQUEST).json({
          success: false,
          message: 'Valid Exam ID is required.',
        });
        return;
      }

      const response = await this._examService.getExamProgress(examId, studentId);
      res.status(response.success ? Status.OK : Status.NOT_FOUND).json(response);
    } catch (error) {
      console.error('Error in getExamProgress controller:', error);
      res.status(Status.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
      });
    }
  }
}