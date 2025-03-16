import { Document, UpdateQuery, FilterQuery } from 'mongoose';
import { UserDoc } from './IUser';
import { AdminDoc } from './IAdmin';
import { OtpDoc } from './IOtp';
import { CategoryDoc } from './ICategory';

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
}

export interface IAdminRepository extends IBaseRepository<AdminDoc> {
    findByEmail(email: string): Promise<AdminDoc | null>;
    createAdmin(adminData: Partial<AdminDoc>): Promise<AdminDoc>;
    // Moved from IUserRepository
    getAllStudents(skip: number, limit: number): Promise<UserDoc[]>;
    countStudents(): Promise<number>;
    findUserById(id: string): Promise<UserDoc | null>; 
    toggleBlockStatus(id: string, isBlocked: boolean): Promise<UserDoc | null>;
    getAllRequestedUsers(skip: number, limit: number): Promise<UserDoc[]>;
    countRequestedUsers(): Promise<number>;
    approveInstructorRequest(id: string): Promise<UserDoc | null>;
    rejectInstructorRequest(id: string): Promise<UserDoc | null>;
    getAllInstructors(skip: number, limit: number): Promise<UserDoc[]>;
    countInstructors(): Promise<number>;
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
    getActiveCategories(skip: number, limit: number): Promise<CategoryDoc[]>;
    countActiveCategories(): Promise<number>;
}