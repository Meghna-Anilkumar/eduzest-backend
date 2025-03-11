import { UserDoc } from "./IUser";
import { CategoryDoc } from "./ICategory";
import { IResponse } from "./IResponse";
import { Response } from "express";


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
}


export interface IAdminService {
    adminLogin(data: { email: string; password: string }): Promise<IResponse>;
    fetchAllStudents(page: number, limit: number): Promise<IResponse>;
    blockUnblockUser(_id: string): Promise<IResponse>
}


export interface ICategoryService {
    createCategory(categoryData: Partial<CategoryDoc>): Promise<IResponse>
}
