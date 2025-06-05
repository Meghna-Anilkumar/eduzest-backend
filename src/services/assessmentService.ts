import { IAssessmentService } from '../interfaces/IServices';
import { IAssessment } from '../interfaces/IAssessments';
import { IAssessmentRepository } from '../interfaces/IRepositories';
import { IEnrollmentRepository } from '../interfaces/IRepositories';
import { IResponse } from '../interfaces/IResponse';
import { IAssessmentResult } from '../interfaces/IAssessments';
import { Types } from 'mongoose'
import { INotificationService } from '../interfaces/IServices';
import { ICourseRepository } from '../interfaces/IRepositories';

export class AssessmentService implements IAssessmentService {
    private _assessmentRepository: IAssessmentRepository;
    private _enrollmentRepository: IEnrollmentRepository;
    private _notificationService: INotificationService;
    private _courseRepository: ICourseRepository;
    constructor(
        assessmentRepository: IAssessmentRepository,
        enrollmentRepository: IEnrollmentRepository,
        notificationService: INotificationService,
        courseRepository: ICourseRepository
    ) {
        this._assessmentRepository = assessmentRepository;
        this._enrollmentRepository = enrollmentRepository;
        this._notificationService = notificationService;
        this._courseRepository = courseRepository;
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

            const course = await this._courseRepository.getCourseById(courseId);
            if (!course) {
                return {
                    success: false,
                    message: 'Course not found.',
                };
            }

            const fullAssessmentData: Partial<IAssessment> = {
                ...assessmentData,
                courseId: new Types.ObjectId(courseId),
                moduleTitle,
            };

            const assessment = await this._assessmentRepository.createAssessment(fullAssessmentData);

            const message = `New assessment "${assessment.title}" added to module "${moduleTitle}" in course "${course.title}".`;
            await this._notificationService.notifyAssessmentAdded(courseId, message);

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

      const course = await this._courseRepository.findById(assessment.courseId.toString());
      if (!course) {
        return {
          success: false,
          message: 'Course not found.',
        };
      }

      // Trigger notification
      const message = `Assessment "${assessment.title}" updated in module "${assessment.moduleTitle}" in course "${course.title}".`;
      await this._notificationService.notifyAssessmentUpdated(assessment.courseId.toString(), message);

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

    async getAssessmentsForStudent(
        courseId: string,
        moduleTitle: string,
        studentId: string,
        page: number,
        limit: number
    ): Promise<IResponse> {
        try {
            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, courseId);
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
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
            console.error('Error in getAssessmentsForStudent service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve assessments.',
            };
        }
    }


    async submitAssessment(
        assessmentId: string,
        studentId: string,
        answers: { questionId: string; selectedAnswer: string }[]
    ): Promise<IResponse> {
        try {
            const assessment = await this._assessmentRepository.findById(assessmentId);
            if (!assessment) {
                return {
                    success: false,
                    message: 'Assessment not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, assessment.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            let score = 0;
            const attemptAnswers = answers.map((answer) => {
                const question = assessment.questions.find((q) => q.id === answer.questionId);
                if (!question) {
                    return {
                        questionId: answer.questionId,
                        selectedAnswer: answer.selectedAnswer,
                        isCorrect: false,
                    };
                }
                const isCorrect = answer.selectedAnswer === question.correctOption;
                if (isCorrect) {
                    score += question.marks || 1;
                }
                return {
                    questionId: answer.questionId,
                    selectedAnswer: answer.selectedAnswer,
                    isCorrect,
                };
            });

            const passed = score / assessment.totalMarks >= 0.7;

            const resultData: Partial<IAssessmentResult> = {
                assessmentId: new Types.ObjectId(assessmentId),
                courseId: assessment.courseId,
                moduleTitle: assessment.moduleTitle,
                studentId: new Types.ObjectId(studentId),
                attempts: [
                    {
                        score,
                        passed,
                        completedAt: new Date(),
                        answers: attemptAnswers,
                    },
                ],
                totalPoints: assessment.totalMarks,
            };

            const result = await this._assessmentRepository.createOrUpdateResult(resultData);

            return {
                success: true,
                message: 'Assessment submitted successfully.',
                data: {
                    score,
                    totalPoints: assessment.totalMarks,
                    passed,
                    attempts: result.attempts.length,
                    status: result.status,
                },
            };
        } catch (error) {
            console.error('Error in submitAssessment service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to submit assessment.',
            };
        }
    }

    async getAssessmentResult(assessmentId: string, studentId: string): Promise<IResponse> {
        try {
            console.log("AssessmentService: getAssessmentResult", { assessmentId, studentId });
            const result = await this._assessmentRepository.findResultByAssessmentAndStudent(assessmentId, studentId);
            if (!result) {
                console.log("AssessmentService: No submission found", { assessmentId, studentId });
                return {
                    success: false,
                    message: 'No submission found for this assessment.',
                };
            }

            console.log("AssessmentService: Result retrieved", result);
            const latestAttempt = result.attempts[result.attempts.length - 1];
            return {
                success: true,
                message: 'Assessment result retrieved successfully.',
                data: {
                    score: latestAttempt.score,
                    totalPoints: result.totalPoints,
                    passed: latestAttempt.passed,
                    attempts: result.attempts,
                    status: result.status,
                },
            };
        } catch (error) {
            console.error('AssessmentService: Error in getAssessmentResult:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve assessment result.',
            };
        }
    }

    async getAssessmentByIdForStudent(assessmentId: string, studentId: string): Promise<IResponse> {
        try {
            const assessment = await this._assessmentRepository.findById(assessmentId);
            if (!assessment) {
                return {
                    success: false,
                    message: 'Assessment not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, assessment.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            return {
                success: true,
                message: 'Assessment retrieved successfully.',
                data: assessment,
            };
        } catch (error) {
            console.error('Error in getAssessmentByIdForStudent service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve assessment.',
            };
        }
    }


    async getCourseProgress(courseId: string, studentId: string): Promise<IResponse> {
        try {
            console.log("AssessmentService: getCourseProgress", { courseId, studentId });
            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, courseId);
            if (!enrollment) {
                console.log("AssessmentService: Student not enrolled", { studentId, courseId });
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            const totalAssessments = await this._assessmentRepository.countAssessmentsByCourse(courseId);
            const passedAssessments = await this._assessmentRepository.countPassedAssessmentsByStudent(courseId, studentId);

            console.log("AssessmentService: Course progress calculated", { totalAssessments, passedAssessments });

            const progress = totalAssessments === 0 ? 0 : (passedAssessments / totalAssessments) * 100;
            if (progress === 100) {
                await this._enrollmentRepository.updateEnrollmentStatus(studentId, courseId, "completed");
            }

            return {
                success: true,
                message: 'Course progress retrieved successfully.',
                data: {
                    totalAssessments,
                    passedAssessments,
                    progress: Number(progress.toFixed(2)),
                },
            };
        } catch (error) {
            console.error('AssessmentService: Error in getCourseProgress:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve course progress.',
            };
        }
    }

    async getAllAssessmentsForCourse(
        courseId: string,
        studentId: string,
        page: number,
        limit: number
    ): Promise<IResponse> {
        try {
            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, courseId);
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            const assessments = await this._assessmentRepository.findByCourse(
                courseId,
                page,
                limit
            );

            const total = await this._assessmentRepository.countByCourse(courseId);

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
            console.error('Error in getAllAssessmentsForCourse service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve assessments.',
            };
        }
    }
}
