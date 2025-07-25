import { UserDoc } from "./IUser";
import { CategoryDoc } from "./ICategory";
import { IResponse } from "./IResponse";
import { Response } from "express";
import { ICourse, FilterOptions, SortOptions } from "./ICourse";
import { IReview } from "./IReview";
import { LessonProgress } from "../models/enrollmentModel";
import { IAssessment } from "./IAssessments";
import { CourseStats } from "./ICourseStats";
import { ICoupon } from "../models/couponModel";
import { IOffer } from '../models/offerModel';
import { IExam } from "./IExam";
import { Server } from 'socket.io';

export interface IUserService {
    signupUser(data: Partial<UserDoc> & { confirmPassword?: string }): Promise<IResponse>;
    verifyOtp(data: { email: string; otp: number }, res: Response): Promise<IResponse>;
    userLogin(data: { email: string; password: string }, res: Response): Promise<IResponse>;
    getUser(token: string): Promise<IResponse>;
    resendOtp(email: string): Promise<IResponse>;
    forgotPassword(email: string): Promise<IResponse>;
    resetPassword(email: string, newPassword: string, confirmNewPassword: string): Promise<IResponse>;
    changePassword(
        email: string,
        passwordData: { currentPassword: string; newPassword: string }
    ): Promise<IResponse>;
    updateStudentProfile(email: string, profileData: Partial<UserDoc>): Promise<IResponse>
    googleAuth(googleUser: { email: string; name: string; username: string }, res: Response): Promise<IResponse>;
    applyForInstructor(data: Partial<UserDoc>): Promise<IResponse>;
    updateInstructorProfile(email: string, profileData: Partial<UserDoc>): Promise<IResponse>;
    refreshToken(refreshToken: string, res: Response): Promise<IResponse>
    switchToInstructor(userId: string, res: Response): Promise<IResponse>
}


export interface IAdminService {
    adminLogin(data: { email: string; password: string }, res: Response): Promise<IResponse>;
    fetchAllStudents(page: number, limit: number, search?: string): Promise<IResponse>
    blockUnblockUser(_id: string): Promise<IResponse>
    fetchAllRequestedUsers(page: number, limit: number): Promise<IResponse>
    approveInstructor(_id: string): Promise<IResponse>
    rejectInstructor(_id: string, rejectionMessage: string): Promise<IResponse>
    fetchAllInstructors(page: number, limit: number, search?: string): Promise<IResponse>
    fetchRequestDetails(_id: string): Promise<IResponse>
    getDashboardStats(period?: "day" | "month" | "year"): any;
}


export interface ICategoryService {
    createCategory(categoryData: Partial<CategoryDoc>): Promise<IResponse>;
    getAllCategories(page: number, limit: number, search?: string): Promise<IResponse>;
    editCategory(categoryId: string, updatedData: Partial<CategoryDoc>): Promise<IResponse>;
    deleteCategory(categoryId: string): Promise<IResponse>;
}

export interface ICourseService {
    createCourse(courseData: Partial<ICourse>): Promise<IResponse>;
    getAllCoursesByInstructor(instructorId: string, page: number, limit: number, search?: string): Promise<IResponse>;
    getAllActiveCourses(
        page: number,
        limit: number,
        search?: string,
        filters?: FilterOptions,
        sort?: SortOptions
    ): Promise<IResponse>;
    getCourseById(courseId: string): Promise<IResponse>
    getCourseByInstructor(courseId: string, instructorId: string): Promise<IResponse>;
    editCourse(courseId: string, instructorId: string, updateData: Partial<ICourse>): Promise<IResponse>;
}


export interface IPaymentService {
    createPaymentIntent(
        userId: string,
        courseId: string,
        amount: number,
        paymentType: "debit" | "credit",
        couponId?: string
    ): Promise<IResponse>;
    confirmPayment(paymentId: string): Promise<IResponse>;
    getPaymentsByUser(
        userId: string,
        page: number,
        limit: number,
        search?: string,
        sort?: { field: string; order: "asc" | "desc" }
    ): Promise<IResponse>;
    getInstructorPayouts(
        instructorId: string,
        page: number,
        limit: number,
        search?: string,
        sort?: { field: string; order: "asc" | "desc" },
        courseFilter?: string
    ): Promise<IResponse>
    getAdminPayouts(
        page: number,
        limit: number,
        search?: string,
        sort?: { field: string; order: "asc" | "desc" },
        courseFilter?: string
    ): Promise<IResponse>
    createSubscription(
        userId: string,
        plan: "monthly" | "yearly",
        paymentType: "debit" | "credit"
    ): Promise<IResponse>;
    confirmSubscription(subscriptionId: string): Promise<IResponse>;
    getSubscriptionStatus(userId: string): Promise<IResponse>;
}

export interface IEnrollCourseService {
    enrollFreeCourse(userId: string, courseId: string): Promise<IResponse>;
    checkEnrollment(userId: string, courseId: string): Promise<IResponse>;
    getEnrollmentsByUserId(
        userId: string,
        page: number,
        limit: number,
        search?: string
    ): Promise<IResponse>
    updateLessonProgress(
        userId: string,
        courseId: string,
        lessonId: string,
        progress: number
    ): Promise<IResponse>
    getLessonProgress(userId: string, courseId: string): Promise<IResponse>
    getInstructorCourseStats(instructorId: string): Promise<CourseStats[]>
}


export interface IReviewService {
    addReview(userId: string, reviewData: Partial<IReview>): Promise<IResponse>;
    getReviewsByCourse(courseId: string, page: number, limit: number): Promise<IResponse>;
    getReviewByUserAndCourse(userId: string, courseId: string): Promise<IResponse>;

}


export interface IRedisService {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expirySeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    getProgress(userId: string, courseId: string): Promise<LessonProgress[] | null>;
    setProgress(userId: string, courseId: string, progress: LessonProgress[], expirySeconds?: number): Promise<void>;
    clearProgress(userId: string, courseId: string): Promise<void>;
}

export interface IAssessmentService {
    createAssessment(
        courseId: string,
        moduleTitle: string,
        instructorId: string,
        assessmentData: Partial<IAssessment>
    ): Promise<IResponse>;
    getAssessmentsByCourseAndModule(
        courseId: string,
        moduleTitle: string,
        instructorId: string,
        page: number,
        limit: number
    ): Promise<IResponse>;
    getAssessmentById(assessmentId: string, instructorId: string): Promise<IResponse>;
    updateAssessment(assessmentId: string, instructorId: string, updateData: Partial<IAssessment>): Promise<IResponse>;
    deleteAssessment(assessmentId: string, instructorId: string): Promise<IResponse>;
    getAssessmentsForStudent(
        courseId: string,
        moduleTitle: string,
        studentId: string,
        page: number,
        limit: number
    ): Promise<IResponse>;
    getAssessmentsForStudent(
        courseId: string,
        moduleTitle: string,
        studentId: string,
        page: number,
        limit: number
    ): Promise<IResponse>;
    submitAssessment(
        assessmentId: string,
        studentId: string,
        answers: { questionId: string; selectedAnswer: string }[]
    ): Promise<IResponse>;
    getAssessmentResult(assessmentId: string, studentId: string): Promise<IResponse>;
    getAssessmentByIdForStudent(assessmentId: string, studentId: string): Promise<IResponse>;
    getCourseProgress(courseId: string, studentId: string): Promise<IResponse>;
    getAllAssessmentsForCourse(
        courseId: string,
        studentId: string,
        page: number,
        limit: number
    ): Promise<IResponse>;

}



export interface IChatService {
    getMessages(courseId: string, page: number, limit: number, userId?: string): Promise<IResponse>;
    sendMessage(userId: string, courseId: string, message: string): Promise<IResponse>;
    getChatGroupMetadata(userId: string, courseIds: string[]): Promise<IResponse>
}



export interface ICouponService {
    addCoupon(couponData: Partial<ICoupon>): Promise<IResponse>;
    editCoupon(couponId: string, couponData: Partial<ICoupon>): Promise<IResponse>;
    deleteCoupon(couponId: string): Promise<IResponse>;
    getAllCoupons(page?: number, limit?: number, search?: string): Promise<IResponse>;
    getActiveCoupons(): Promise<IResponse>
    checkCouponUsage(userId: string, couponId: string): Promise<IResponse>
}


export interface IOfferService {
    addOffer(offerData: Partial<IOffer>): Promise<IResponse>;
    editOffer(offerId: string, offerData: Partial<IOffer>): Promise<IResponse>;
    deleteOffer(offerId: string): Promise<IResponse>;
    getAllOffers(page?: number, limit?: number): Promise<IResponse>;
    getActiveOffers(categoryId?: string): Promise<IResponse>;
    checkOfferUsage(userId: string, offerId: string): Promise<IResponse>;
}


export interface IExamService {
    createExam(courseId: string, instructorId: string, examData: Partial<IExam>): Promise<IResponse>;
    getExamsByCourse(courseId: string, instructorId: string, page: number, limit: number): Promise<IResponse>;
    getExamById(examId: string, instructorId: string): Promise<IResponse>;
    updateExam(examId: string, instructorId: string, updateData: Partial<IExam>): Promise<IResponse>;
    deleteExam(examId: string, instructorId: string): Promise<IResponse>;
    getExamsForStudent(courseId: string, studentId: string, page: number, limit: number): Promise<IResponse>;
    startExam(examId: string, studentId: string): Promise<IResponse>;
    submitExam(
        examId: string,
        studentId: string,
        answers: { questionId: string; selectedAnswerIndex: number }[],
        isAutoSubmit?: boolean
    ): Promise<IResponse>;
    getExamResult(examId: string, studentId: string): Promise<IResponse>;
    getExamByIdForStudent(examId: string, studentId: string): Promise<IResponse>;
    getExamProgress(examId: string, studentId: string): Promise<IResponse>
    getLeaderboard(courseId?: string, limit?: number): Promise<{
        rank: number;
        studentId: string;
        studentName: string;
        totalScore: number;
    }[]>
    getStudentRank(studentId: string, courseId?: string): Promise<{
        rank: number;
        totalScore: number;
    } | null>
}



export interface INotificationService {
    notifyCourseUpdate(courseId: string, message: string): Promise<IResponse>;
    notifyAssessmentAdded(courseId: string, message: string): Promise<IResponse>;
    notifyAssessmentUpdated(courseId: string, message: string): Promise<IResponse>;
    notifyExamAdded(courseId: string, message: string): Promise<IResponse>;
    notifyExamUpdated(courseId: string, message: string): Promise<IResponse>;
    notifyExamDeleted(courseId: string, message: string): Promise<IResponse>;
    getNotifications(userId: string, page: number, limit: number): Promise<IResponse>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(notificationId: string, userId: string): Promise<IResponse>;
    markAllAsRead(userId: string): Promise<IResponse>;
}