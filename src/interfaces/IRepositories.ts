import { Document, UpdateQuery, FilterQuery } from 'mongoose';
import { UserDoc } from './IUser';
import { AdminDoc } from './IAdmin';
import { OtpDoc } from './IOtp';
import { CategoryDoc } from './ICategory';
import { ICourse } from './ICourse';
import { Types } from "mongoose";
import { PaymentDoc } from '../models/paymentModel';
import { EnrollmentDoc } from '../models/enrollmentModel';
import { IReview } from './IReview';
import { LessonProgress } from '../models/enrollmentModel';
import { IAssessment } from './IAssessments';
import { IAssessmentResult } from './IAssessments';


export interface IBaseRepository<T extends Document> {
    findAll(filter: Record<string, unknown>, skip: number, sort: any, limit?: number): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    findByQuery(query: FilterQuery<T>): Promise<T | null>;
    create(item: Partial<T>): Promise<T>;
    update(query: any, item: UpdateQuery<T>, options?: any): Promise<T | null>;
    delete(id: any): Promise<boolean>;
    count(filter: Record<string, unknown>): Promise<number>;
}

export interface IUserRepository extends IBaseRepository<UserDoc> {
    findByEmail(email: string): Promise<UserDoc | null>;
    createUser(userData: Partial<UserDoc>): Promise<UserDoc>;
    updateVerificationStatus(email: string, isVerified: boolean): Promise<UserDoc | null>;
    updatePassword(email: string, hashedPassword: string): Promise<UserDoc | null>;
    updateUserProfile(email: string, profileData: Partial<UserDoc>): Promise<UserDoc | null>;
    updateToGoogleAuth(email: string): Promise<UserDoc | null>;
    submitInstructorApplication(email: string, applicationData: Partial<UserDoc>): Promise<UserDoc | null>;
    isEmailRegistered(email: string): Promise<boolean>;
    isUserVerified(email: string): Promise<boolean>;
    isUserBlocked(email: string): Promise<boolean>;
    validatePassword(email: string, password: string, comparePasswordFn: Function): Promise<boolean>;
    hasRequestedInstructor(email: string): Promise<boolean>;
    updateStudentProfile(email: string, updatedData: Partial<UserDoc>): Promise<UserDoc | null>;
    updateInstructorProfile(email: string, updatedData: Partial<UserDoc>): Promise<UserDoc | null>;
    storeRefreshToken(userId: string, refreshToken: string): Promise<void>;
    getRefreshToken(userId: string): Promise<string | null>;
    clearRefreshToken(userId: string): Promise<void>;
}

export interface IAdminRepository extends IBaseRepository<AdminDoc> {
    findByEmail(email: string): Promise<AdminDoc | null>;
    createAdmin(adminData: Partial<AdminDoc>): Promise<AdminDoc>;
    getAllStudents(skip: number, limit: number, search?: string): Promise<UserDoc[]>;
    countStudents(search?: string): Promise<number>;
    findUserById(id: string): Promise<UserDoc | null>;
    toggleBlockStatus(id: string, isBlocked: boolean): Promise<UserDoc | null>;
    getAllRequestedUsers(skip: number, limit: number): Promise<UserDoc[]>;
    countRequestedUsers(): Promise<number>;
    approveInstructorRequest(id: string): Promise<UserDoc | null>;
    rejectInstructorRequest(id: string): Promise<UserDoc | null>;
    getAllInstructors(skip: number, limit: number, search?: string): Promise<UserDoc[]>;
    countInstructors(search?: string): Promise<number>;
}

export interface IOtpRepository extends IBaseRepository<OtpDoc> {
    findByEmail(email: string): Promise<OtpDoc | null>;
    createOtp(otpData: { email: string; otp: number; expiresAt: Date }): Promise<OtpDoc>;
    updateOtp(email: string, otpData: { otp: number; expiresAt: Date }): Promise<OtpDoc | null>;
    deleteOtpByEmail(email: string): Promise<boolean>;
    clearExpiredOtp(email: string): Promise<OtpDoc | null>;
    isOtpValid(email: string, otp: number): Promise<boolean>;
    isOtpExpired(email: string): Promise<boolean>;
}


export interface ICategoryRepository extends IBaseRepository<CategoryDoc> {
    findByName(categoryName: string): Promise<CategoryDoc | null>;
    toggleCategoryStatus(id: string, isActive: boolean): Promise<CategoryDoc | null>;
    getAllCategories(skip: number, limit: number, search?: string): Promise<CategoryDoc[]>;
    countCategories(search?: string): Promise<number>;
}

export interface ICourseRepository extends IBaseRepository<ICourse> {
    createCourse(courseData: Partial<ICourse>): Promise<ICourse>;
    findByTitleAndInstructor(title: string, instructorId: Types.ObjectId): Promise<ICourse | null>;
    getAllCoursesByInstructor(query: any, page: number, limit: number): Promise<ICourse[]>;
    countDocuments(query: any): Promise<number>;
    getAllActiveCourses(
        query: any,
        page: number,
        limit: number,
        sort?: any
    ): Promise<ICourse[]>;
    getCourseById(courseId: string): Promise<ICourse | null>
    editCourse(courseId: string, instructorId: string, updateData: Partial<ICourse>): Promise<ICourse | null>;
    getCourseByInstructor(courseId: string, instructorId: string): Promise<ICourse | null>;
}


export interface IPaymentRepository extends IBaseRepository<PaymentDoc> {
    findByUserId(userId: string): Promise<PaymentDoc[]>;
    findByCourseId(courseId: string): Promise<PaymentDoc[]>;
    updatePaymentStatus(paymentId: string, status: PaymentDoc["status"]): Promise<PaymentDoc | null>;
    createPayment(paymentData: Partial<PaymentDoc>): Promise<PaymentDoc>;
    getPaymentsByUser(
        userId: string,
        page: number,
        limit: number,
        search?: string,
        sort?: { field: string; order: "asc" | "desc" }
    ): Promise<{ data: PaymentDoc[]; total: number; page: number; limit: number }>;
    getInstructorPayouts(
        instructorId: string,
        page: number,
        limit: number,
        search?: string,
        sort?: { field: string; order: "asc" | "desc" }
    ): Promise<{ data: PaymentDoc[]; total: number; page: number; limit: number }>;
    getAdminPayouts(
        page: number,
        limit: number,
        search?: string,
        sort?: { field: string; order: "asc" | "desc" }
    ): Promise<{ data: PaymentDoc[]; total: number; page: number; limit: number }>;
}


export interface IEnrollmentRepository {
    findByUserId(userId: string): Promise<EnrollmentDoc[]>;
    findByCourseId(courseId: string): Promise<EnrollmentDoc[]>;
    findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentDoc | null>;
    createEnrollment(enrollmentData: Partial<EnrollmentDoc>): Promise<EnrollmentDoc>;
    updateCompletionStatus(
        enrollmentId: string,
        status: EnrollmentDoc["completionStatus"]
    ): Promise<EnrollmentDoc | null>;
    updateLessonProgress(
        userId: string,
        courseId: string,
        lessonId: string,
        progress: number
    ): Promise<EnrollmentDoc | null>;

    getLessonProgress(userId: string, courseId: string): Promise<LessonProgress[]>;
}


export interface IReviewRepository {
    createReview(reviewData: Partial<IReview>): Promise<IReview>;
    findByUserAndCourse(userId: string, courseId: string): Promise<IReview | null>;
    getReviewsByCourse(courseId: string, skip: number, limit: number): Promise<IReview[]>;
    countReviewsByCourse(courseId: string): Promise<number>;
}


export interface IAssessmentRepository {
    createAssessment(assessmentData: Partial<IAssessment>): Promise<IAssessment>;
    findByCourseAndModule(courseId: string, moduleTitle: string, page: number, limit: number): Promise<IAssessment[]>;
    countByCourseAndModule(courseId: string, moduleTitle: string): Promise<number>;
    findByIdAndInstructor(assessmentId: string, instructorId: string): Promise<IAssessment | null>;
    updateAssessment(assessmentId: string, instructorId: string, updateData: Partial<IAssessment>): Promise<IAssessment | null>;
    deleteAssessment(assessmentId: string, instructorId: string): Promise<boolean>;
    getCourseIdsByInstructor(instructorId: string): Promise<Types.ObjectId[]>;
    findById(assessmentId: string): Promise<IAssessment | null>;
    createOrUpdateResult(resultData: Partial<IAssessmentResult>): Promise<IAssessmentResult>;
    findResultByAssessmentAndStudent(assessmentId: string, studentId: string): Promise<IAssessmentResult | null>;
}