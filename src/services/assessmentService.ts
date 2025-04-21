import { IAssessmentService } from '../interfaces/IServices';
import { IAssessment } from '../interfaces/IAssessments';
import { IAssessmentRepository } from '../interfaces/IRepositories';
import { IResponse } from '../interfaces/IResponse';
import { Types } from 'mongoose'

export class AssessmentService implements IAssessmentService {
    private _assessmentRepository: IAssessmentRepository;

    constructor(assessmentRepository: IAssessmentRepository) {
        this._assessmentRepository = assessmentRepository;
    }

    async createAssessment(
        courseId: string,
        moduleTitle: string,
        instructorId: string,
        assessmentData: Partial<IAssessment>
    ): Promise<IResponse> {
        try {
            const courseIds = await this._assessmentRepository.getCourseIdsByInstructor(instructorId);
            if (!courseIds.some(id => id.toString() === courseId)) {
                return {
                    success: false,
                    message: 'Instructor does not have access to this course.',
                };
            }

            const fullAssessmentData: Partial<IAssessment> = {
                ...assessmentData,
                courseId: new Types.ObjectId(courseId),
                moduleTitle,
            };

            const assessment = await this._assessmentRepository.createAssessment(fullAssessmentData);

            return {
                success: true,
                message: 'Assessment created successfully.',
                data: assessment,
            };
        } catch (error) {
            console.error('Error in createAssessment service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create assessment.',
            };
        }
    }

    async getAssessmentsByCourseAndModule(
        courseId: string,
        moduleTitle: string,
        instructorId: string,
        page: number,
        limit: number
    ): Promise<IResponse> {
        try {
            const courseIds = await this._assessmentRepository.getCourseIdsByInstructor(instructorId);
            if (!courseIds.some(id => id.toString() === courseId)) {
                return {
                    success: false,
                    message: 'Instructor does not have access to this course.',
                };
            }

            const assessments = await this._assessmentRepository.findByCourseAndModule(
                courseId,
                moduleTitle,
                page,
                limit
            );

            const total = await this._assessmentRepository.countByCourseAndModule(courseId, moduleTitle);

            return {
                success: true,
                message: 'Assessments retrieved successfully.',
                data: {
                    assessments,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error('Error in getAssessmentsByCourseAndModule service:', error);
            return {
                success: false,
                message: 'Failed to retrieve assessments.',
            };
        }
    }

    async getAssessmentById(assessmentId: string, instructorId: string): Promise<IResponse> {
        try {
            const assessment = await this._assessmentRepository.findByIdAndInstructor(assessmentId, instructorId);

            if (!assessment) {
                return {
                    success: false,
                    message: 'Assessment not found or instructor does not have access.',
                };
            }

            return {
                success: true,
                message: 'Assessment retrieved successfully.',
                data: assessment,
            };
        } catch (error) {
            console.error('Error in getAssessmentById service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve assessment.',
            };
        }
    }

    async updateAssessment(
        assessmentId: string,
        instructorId: string,
        updateData: Partial<IAssessment>
    ): Promise<IResponse> {
        try {
            const assessment = await this._assessmentRepository.updateAssessment(assessmentId, instructorId, updateData);

            if (!assessment) {
                return {
                    success: false,
                    message: 'Assessment not found or instructor does not have access.',
                };
            }

            return {
                success: true,
                message: 'Assessment updated successfully.',
                data: assessment,
            };
        } catch (error) {
            console.error('Error in updateAssessment service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update assessment.',
            };
        }
    }

    async deleteAssessment(assessmentId: string, instructorId: string): Promise<IResponse> {
        try {
            const deleted = await this._assessmentRepository.deleteAssessment(assessmentId, instructorId);

            if (!deleted) {
                return {
                    success: false,
                    message: 'Assessment not found or instructor does not have access.',
                };
            }

            return {
                success: true,
                message: 'Assessment deleted successfully.',
            };
        } catch (error) {
            console.error('Error in deleteAssessment service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete assessment.',
            };
        }
    }
}
