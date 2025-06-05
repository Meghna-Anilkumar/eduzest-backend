import { Types } from 'mongoose';
import { IExam, IExamResult } from '../interfaces/IExam';
import { IExamRepository, IEnrollmentRepository } from '../interfaces/IRepositories';
import { IResponse } from '../interfaces/IResponse';
import { RedisService } from '../services/redisService';
import { NotificationService } from '../services/notificationService';
import { CourseRepository } from '../repositories/courseRepository';

export class ExamService {
    private _examRepository: IExamRepository;
    private _enrollmentRepository: IEnrollmentRepository;
    private _redisService: RedisService;
    private _notificationService: NotificationService;
    private _courseRepository: CourseRepository;

    constructor(
        examRepository: IExamRepository,
        enrollmentRepository: IEnrollmentRepository,
        redisService: RedisService,
        notificationService: NotificationService,
        courseRepository: CourseRepository
    ) {
        this._examRepository = examRepository;
        this._enrollmentRepository = enrollmentRepository;
        this._redisService = redisService;
        this._notificationService = notificationService;
        this._courseRepository = courseRepository;
    }


    async createExam(
        courseId: string,
        instructorId: string,
        examData: Partial<IExam>
    ): Promise<IResponse> {
        try {
            const courseIds = await this._examRepository.getCourseIdsByInstructor(instructorId);
            if (!courseIds.some((id) => id.toString() === courseId)) {
                return {
                    success: false,
                    message: 'Instructor does not have access to this course.',
                };
            }

            const course = await this._courseRepository.findById(courseId);
            if (!course) {
                return {
                    success: false,
                    message: 'Course not found.',
                };
            }

            const fullExamData: Partial<IExam> = {
                ...examData,
                courseId: new Types.ObjectId(courseId),
            };

            const exam = await this._examRepository.createExam(fullExamData);

            const message = `New exam "${exam.title}" added to course "${course.title}".`;
            await this._notificationService.notifyExamAdded(courseId, message);

            return {
                success: true,
                message: 'Exam created successfully.',
                data: exam,
            };
        } catch (error) {
            console.error('Error in createExam service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create exam.',
            };
        }
    }


    async getExamsByCourse(
        courseId: string,
        instructorId: string,
        page: number,
        limit: number
    ): Promise<IResponse> {
        try {
            const courseIds = await this._examRepository.getCourseIdsByInstructor(instructorId);
            if (!courseIds.some((id) => id.toString() === courseId)) {
                return {
                    success: false,
                    message: 'Instructor does not have access to this course.',
                };
            }

            const exams = await this._examRepository.findByCourse(courseId, page, limit);
            const total = await this._examRepository.countByCourse(courseId);

            return {
                success: true,
                message: 'Exams retrieved successfully.',
                data: {
                    exams,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error('Error in getExamsByCourse service:', error);
            return {
                success: false,
                message: 'Failed to retrieve exams.',
            };
        }
    }

    async getExamById(examId: string, instructorId: string): Promise<IResponse> {
        try {
            const exam = await this._examRepository.findByIdAndInstructor(examId, instructorId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found or instructor does not have access.',
                };
            }

            return {
                success: true,
                message: 'Exam retrieved successfully.',
                data: exam,
            };
        } catch (error) {
            console.error('Error in getExamById service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve exam.',
            };
        }
    }

    async updateExam(
        examId: string,
        instructorId: string,
        updateData: Partial<IExam>
    ): Promise<IResponse> {
        try {
            const exam = await this._examRepository.updateExam(examId, instructorId, updateData);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found or instructor does not have access.',
                };
            }

            const course = await this._courseRepository.findById(exam.courseId.toString());
            if (!course) {
                return {
                    success: false,
                    message: 'Course not found.',
                };
            }

            const message = `Exam "${exam.title}" updated in course "${course.title}".`;
            await this._notificationService.notifyExamUpdated(exam.courseId.toString(), message);

            return {
                success: true,
                message: 'Exam updated successfully.',
                data: exam,
            };
        } catch (error) {
            console.error('Error in updateExam service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update exam.',
            };
        }
    }

    async deleteExam(examId: string, instructorId: string): Promise<IResponse> {
        try {
            const exam = await this._examRepository.findByIdAndInstructor(examId, instructorId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found or instructor does not have access.',
                };
            }

            const course = await this._courseRepository.findById(exam.courseId.toString());
            if (!course) {
                return {
                    success: false,
                    message: 'Course not found.',
                };
            }

            const deleted = await this._examRepository.deleteExam(examId, instructorId);
            if (!deleted) {
                return {
                    success: false,
                    message: 'Exam not found or instructor does not have access.',
                };
            }

            const message = `Exam "${exam.title}" deleted from course "${course.title}".`;
            await this._notificationService.notifyExamDeleted(exam.courseId.toString(), message);

            return {
                success: true,
                message: 'Exam deleted successfully.',
            };
        } catch (error) {
            console.error('Error in deleteExam service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete exam.',
            };
        }
    }

    async getExamsForStudent(
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
                    message: "Student is not enrolled in this course.",
                };
            }

            const course = await this._examRepository.findCourseById(courseId);
            if (!course) {
                return {
                    success: false,
                    message: "Course not found.",
                };
            }

            const totalAssessments = await this._examRepository.countTotalAssessments(courseId);
            const passedAssessments = await this._examRepository.countPassedAssessments(courseId, studentId);

            if (totalAssessments !== passedAssessments) {
                return {
                    success: false,
                    message: "All module assessments must be completed before accessing exams.",
                };
            }

            const exams = await this._examRepository.findByCourse(courseId, page, limit);
            const total = await this._examRepository.countByCourse(courseId);

            return {
                success: true,
                message: "Exams retrieved successfully.",
                data: {
                    exams,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error("Error in getExamsForStudent service:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to retrieve exams.",
            };
        }
    }

    async startExam(examId: string, studentId: string): Promise<IResponse> {
        try {
            const exam = await this._examRepository.findById(examId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, exam.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            const progressKey = `exam:${examId}:${studentId}:progress`;
            const startTimeKey = `exam:${examId}:${studentId}:startTime`;
            console.log('[ExamService] Checking progress key:', progressKey);
            const existingProgress = await this._redisService.get(progressKey);
            if (existingProgress) {
                console.log('[ExamService] Existing progress found:', existingProgress);
                return {
                    success: true,
                    message: 'Exam already started.',
                    data: JSON.parse(existingProgress),
                };
            }

            const initialProgress = {
                startTime: new Date().toISOString(),
                answers: [],
                isSubmitted: false,
            };
            console.log('[ExamService] Setting initial progress:', { progressKey, initialProgress });
            await this._redisService.set(progressKey, JSON.stringify(initialProgress), exam.duration * 60 + 60);
            await this._redisService.set(startTimeKey, initialProgress.startTime, exam.duration * 60 + 60);

            return {
                success: true,
                message: 'Exam started successfully.',
                data: initialProgress,
            };
        } catch (error) {
            console.error('Error in startExam service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to start exam.',
            };
        }
    }

    async submitExam(
        examId: string,
        studentId: string,
        answers: { questionId: string; selectedAnswerIndex: number }[],
        isAutoSubmit: boolean = false
    ): Promise<IResponse> {
        try {
            console.log('[ExamService] Submitting exam:', { examId, studentId, answers, isAutoSubmit });
            const exam = await this._examRepository.findById(examId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, exam.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            if (!isAutoSubmit) {
                const startTimeStr = await this._redisService.get(`exam:${examId}:${studentId}:startTime`);
                if (startTimeStr) {
                    const startTime = new Date(startTimeStr);
                    const currentTime = new Date();
                    const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / 1000 / 60;
                    if (elapsedMinutes > exam.duration) {
                        return {
                            success: false,
                            message: 'Exam duration has expired.',
                        };
                    }
                }
            }

            let score = 0;
            const attemptAnswers = answers.map((answer) => {
                const question = exam.questions.find((q) => q.id === answer.questionId);
                if (!question) {
                    return {
                        questionId: answer.questionId,
                        selectedAnswerIndex: answer.selectedAnswerIndex,
                        isCorrect: false,
                    };
                }
                const isCorrect = answer.selectedAnswerIndex === question.correctAnswerIndex;
                if (isCorrect) {
                    score += question.marks || 1;
                }
                return {
                    questionId: answer.questionId,
                    selectedAnswerIndex: answer.selectedAnswerIndex,
                    isCorrect,
                };
            });

            const passed = (score / exam.totalMarks) * 100 >= exam.passingCriteria;

            const resultData: Partial<IExamResult> = {
                examId: new Types.ObjectId(examId),
                courseId: exam.courseId,
                studentId: new Types.ObjectId(studentId),
                attempts: [
                    {
                        score,
                        passed,
                        completedAt: new Date(),
                        answers: attemptAnswers,
                    },
                ],
                totalPoints: exam.totalMarks,
            };

            const result = await this._examRepository.createOrUpdateResult(resultData);

            await this._redisService.del(`exam:${examId}:${studentId}:startTime`);
            await this._redisService.del(`exam:${examId}:${studentId}:progress`);

            return {
                success: true,
                message: 'Exam submitted successfully.',
                data: {
                    score,
                    totalPoints: exam.totalMarks,
                    passed,
                    attempts: result.attempts.length,
                    status: result.status,
                    answers: attemptAnswers.map((answer) => ({
                        ...answer,
                        explanation: exam.questions.find((q) => q.id === answer.questionId)?.explanation,
                    })),
                },
            };
        } catch (error) {
            console.error('Error in submitExam service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to submit exam.',
            };
        }
    }

    async getExamResult(examId: string, studentId: string): Promise<IResponse> {
        try {
            const result = await this._examRepository.findResultByExamAndStudent(examId, studentId);
            if (!result) {
                return {
                    success: false,
                    message: 'No submission found for this exam.',
                };
            }

            const exam = await this._examRepository.findById(examId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found.',
                };
            }

            const latestAttempt = result.attempts[result.attempts.length - 1];
            return {
                success: true,
                message: 'Exam result retrieved successfully.',
                data: {
                    score: latestAttempt.score,
                    totalPoints: result.totalPoints,
                    passed: latestAttempt.passed,
                    attempts: result.attempts.map((attempt) => ({
                        score: attempt.score,
                        passed: attempt.passed,
                        completedAt: attempt.completedAt,
                        answers: attempt.answers.map((answer) => ({
                            questionId: answer.questionId,
                            selectedAnswerIndex: answer.selectedAnswerIndex,
                            isCorrect: answer.isCorrect,
                            explanation: exam.questions.find((q) => q.id === answer.questionId)?.explanation,
                        })),
                    })),
                    status: result.status,
                },
            };
        } catch (error) {
            console.error('Error in getExamResult service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve exam result.',
            };
        }
    }

    async getExamByIdForStudent(examId: string, studentId: string): Promise<IResponse> {
        try {
            const exam = await this._examRepository.findById(examId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, exam.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            const totalAssessments = await this._examRepository.countTotalAssessments(exam.courseId.toString());
            const passedAssessments = await this._examRepository.countPassedAssessments(exam.courseId.toString(), studentId);

            if (totalAssessments !== passedAssessments) {
                return {
                    success: false,
                    message: 'All module assessments must be completed before accessing this exam.',
                };
            }

            return {
                success: true,
                message: 'Exam retrieved successfully.',
                data: exam,
            };
        } catch (error) {
            console.error('Error in getExamByIdForStudent service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve exam.',
            };
        }
    }

    async findExamById(examId: string): Promise<IExam | null> {
        try {
            return await this._examRepository.findById(examId);
        } catch (error) {
            console.error('Error in findExamById service:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to find exam.');
        }
    }

    async getExamStartTime(examId: string, studentId: string): Promise<string | null> {
        try {
            return await this._examRepository.getExamStartTime(examId, studentId);
        } catch (error) {
            console.error('Error in getExamStartTime service:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to get exam start time.');
        }
    }

    async saveExamProgress(
        examId: string,
        studentId: string,
        answers: { questionId: string; selectedAnswerIndex: number }[]
    ): Promise<IResponse> {
        try {
            const exam = await this._examRepository.findById(examId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, exam.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            const progressKey = `exam:${examId}:${studentId}:progress`;
            const existingProgress = await this._redisService.get(progressKey);
            if (!existingProgress) {
                return {
                    success: false,
                    message: 'Exam not started.',
                };
            }

            const progress = JSON.parse(existingProgress);
            progress.answers = answers;
            console.log('[ExamService] Saving progress', { progressKey, progress }); // Debug log

            await this._redisService.set(progressKey, JSON.stringify(progress), exam.duration * 60);

            return {
                success: true,
                message: 'Exam progress saved successfully.',
            };
        } catch (error) {
            console.error('Error in saveExamProgress service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save exam progress.',
            };
        }
    }

    async getExamProgress(examId: string, studentId: string): Promise<IResponse> {
        try {
            const exam = await this._examRepository.findById(examId);
            if (!exam) {
                return {
                    success: false,
                    message: 'Exam not found.',
                };
            }

            const enrollment = await this._enrollmentRepository.findByUserAndCourse(studentId, exam.courseId.toString());
            if (!enrollment) {
                return {
                    success: false,
                    message: 'Student is not enrolled in this course.',
                };
            }

            const progressKey = `exam:${examId}:${studentId}:progress`;
            console.log(progressKey, 'llllllllllllllllllll')
            const progressData = await this._redisService.get(progressKey);
            console.log(progressData, 'kkkkkkkkkkkkkkk')
            if (!progressData) {
                return {
                    success: false,
                    message: 'No progress found.',
                    data: {
                        startTime: null,
                        answers: [],
                        isSubmitted: false,
                    },
                };
            }

            const progress = JSON.parse(progressData);
            return {
                success: true,
                message: 'Exam progress retrieved successfully.',
                data: progress,
            };
        } catch (error) {
            console.error('Error in getExamProgress service:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to retrieve exam progress.',
            };
        }
    }

    async getLeaderboard(courseId?: string, limit: number = 10): Promise<{
        rank: number;
        studentId: string;
        studentName: string;
        totalScore: number;
    }[]> {
        try {
            const leaderboard = await this._examRepository.getLeaderboard(courseId, limit);
            return leaderboard;
        } catch (error) {
            console.error('Error in getLeaderboard service:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to retrieve leaderboard.');
        }
    }


    async getStudentRank(studentId: string, courseId?: string): Promise<{
        rank: number;
        totalScore: number;
    } | null> {
        try {
            const rankData = await this._examRepository.getStudentRank(studentId, courseId);
            console.log(rankData, 'jjjjjjjjjjjjjjjjjjjjjjjjjjjj')
            return rankData;
        } catch (error) {
            console.error('Error in getStudentRank service:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to retrieve student rank.');
        }
    }
}