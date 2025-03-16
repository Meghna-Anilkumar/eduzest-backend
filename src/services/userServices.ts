import UserRepository from '../repositories/userRepository';
import OtpRepository from "../repositories/otpRepository";
import { IUserService } from '../interfaces/IServices';
import { IResponse } from '../interfaces/IResponse';
import { UserDoc } from '../interfaces/IUser';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { CustomError } from '../utils/CustomError';
import { generateOTP } from '../utils/OTPGenerator';
import { sendEmail } from '../utils/nodemailer';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { validateName, validateEmail, validatePassword, validateDOB, validateMobileNumber } from '../utils/validator';
import { Response } from 'express';
import { Cookie } from '../interfaces/IEnums';
import * as crypto from 'crypto';
import { IUserRepository, IOtpRepository } from '../interfaces/IRepositories';

export class UserService implements IUserService {
    private _userRepository: IUserRepository;
    private _otpRepository: IOtpRepository;

    constructor(userRepository: UserRepository, otpRepository: OtpRepository) {
        this._userRepository = userRepository;
        this._otpRepository = otpRepository;
    }

    // signupUser 
    async signupUser(data: Partial<UserDoc> & { confirmPassword?: string }): Promise<IResponse> {
        try {
            const { name, email, password, confirmPassword } = data;

            if (!name?.trim()) throw new CustomError('Name is required', 400, 'name');
            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!password?.trim()) throw new CustomError('Password is required', 400, 'password');
            if (!confirmPassword?.trim()) throw new CustomError('Confirm Password is required', 400, 'confirmPassword');

            validateName(name);
            validateEmail(email);
            validatePassword(password);

            if (password !== confirmPassword) {
                throw new CustomError('Passwords do not match', 400, 'confirmPassword');
            }

            const existingUser = await this._userRepository.findByEmail(email);

            if (existingUser?.isVerified) {
                return {
                    success: false,
                    message: 'Email already exists',
                    data: { email: 'Email already exists' }
                };
            }

            const hashedPassword = await hashPassword(password.trim());

            let user;
            if (existingUser) {
                user = await this._userRepository.updateUserProfile(email, {
                    name,
                    password: hashedPassword,
                    isVerified: false
                });
            } else {
                user = await this._userRepository.createUser({
                    name,
                    email,
                    password: hashedPassword,
                    isVerified: false,
                });
            }

            const OTP = generateOTP();
            console.log('otp:', OTP)
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);
            const existingOtp = await this._otpRepository.findByEmail(email);

            if (existingOtp) {
                await this._otpRepository.updateOtp(email, { otp: OTP, expiresAt: otpExpiration });
            } else {
                await this._otpRepository.createOtp({ email, otp: OTP, expiresAt: otpExpiration });
            }

            await sendEmail(email, 'Your OTP for Sign Up', `Your OTP for verification is: ${OTP}`);

            return {
                success: true,
                message: "Please verify your email for OTP verification.",
                data: user,
                redirectURL: '/otp-verification'
            };
        } catch (error) {
            console.error('Signup Error:', error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    data: error.field ? { [error.field]: error.message } : undefined,
                };
            }
            return { success: false, message: "An unexpected error occurred." };
        }
    }

    // verifyOtp 
    async verifyOtp({ email, otp }: { email: string; otp: number }, res: Response): Promise<IResponse> {
        try {
            const otpData = await this._otpRepository.findByEmail(email);

            if (!otpData) {
                return {
                    success: false,
                    message: "No OTP found for this email.",
                };
            }

            const isOtpExpired = await this._otpRepository.isOtpExpired(email);
            if (isOtpExpired) {
                await this._otpRepository.clearExpiredOtp(email);
                return {
                    success: false,
                    message: "OTP expired. Please request a new one.",
                };
            }

            const isValid = await this._otpRepository.isOtpValid(email, otp);
            if (!isValid) {
                return {
                    success: false,
                    message: "Invalid OTP.",
                };
            }

            const isVerified = await this._userRepository.isUserVerified(email);
            if (isVerified) {
                return {
                    success: true,
                    message: 'OTP verified. Reset your password',
                    redirectURL: '/reset-password'
                };
            }

            await this._userRepository.updateVerificationStatus(email, true);
            await this._otpRepository.deleteOtpByEmail(email);

            const user = await this._userRepository.findByEmail(email);

            return {
                success: true,
                message: "OTP verified successfully. Your account is now activated.",
                redirectURL: "/login",
                userData: user,
            };
        } catch (error) {
            console.error("Error during OTP verification:", error);
            return {
                success: false,
                message: "OTP verification failed. Please try again.",
            };
        }
    }

    // userLogin 
    async userLogin({ email, password }: { email: string; password: string }, res: Response): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findByEmail(email);

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            const isBlocked = await this._userRepository.isUserBlocked(email);
            if (isBlocked) {
                return {
                    success: false,
                    message: "Your account has been blocked. Please contact support.",
                };
            }

            const isVerified = await this._userRepository.isUserVerified(email);
            if (!isVerified) {
                return {
                    success: false,
                    message: "Invalid credentials.",
                };
            }

            const isPasswordValid = await this._userRepository.validatePassword(email, password, comparePassword);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: "Incorrect password.",
                };
            }

            const token = generateToken(existingUser);
            const refreshToken = generateRefreshToken(existingUser);

            res.cookie(Cookie.userJWT, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 24 * 60 * 60 * 1000, 
            });

            return {
                success: true,
                message: "Login successful.",
                userData: existingUser,
                token,
                refreshToken,
            };
        } catch (error) {
            console.error("Error during user login:", error);
            return {
                success: false,
                message: "Login failed. Please try again.",
            };
        }
    }
    
    // getUser 
    async getUser(token: string): Promise<IResponse> {
        try {
            const payload = verifyToken(token); 
            const userId = payload.id;

            if (!userId) {
                return {
                    success: false,
                    message: "Invalid token payload",
                    data: null,
                };
            }

            const user = await this._userRepository.findById(userId);

            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                    data: null,
                };
            }

            return {
                success: true,
                message: "User details fetched successfully",
                data: user,
            };
        } catch (error) {
            console.error("Error fetching user details:", error);
            return {
                success: false,
                message: "An error occurred while fetching user details",
                data: null,
            };
        }
    }

    // resendOtp 
    async resendOtp(email: string): Promise<IResponse> {
        try {
            if (!email) {
                throw new CustomError("Email is required", 400, "email");
            }

            const userExists = await this._userRepository.isEmailRegistered(email);
            if (!userExists) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            const OTP = generateOTP();
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);

            const existingOtp = await this._otpRepository.findByEmail(email);

            if (existingOtp) {
                await this._otpRepository.updateOtp(email, { otp: OTP, expiresAt: otpExpiration });
            } else {
                await this._otpRepository.createOtp({ email, otp: OTP, expiresAt: otpExpiration });
            }

            await sendEmail(email, "Your OTP for Verification", `Your new OTP is: ${OTP}`);

            return {
                success: true,
                message: "A new OTP has been sent to your email. Please check your inbox.",
            };
        } catch (error) {
            console.error("Error resending OTP:", error);
            return {
                success: false,
                message: "Failed to resend OTP. Please try again.",
            };
        }
    }

    // forgotPassword 
    async forgotPassword(email: string): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findByEmail(email);

            if (!existingUser) {
                return {
                    success: false,
                    message: "Invalid email. Please try with your registered email.",
                    redirectURL: "/signup",
                };
            }

            if (!existingUser.isVerified) {
                return {
                    success: false,
                    message: "User is not verified. Please complete your sign-up process.",
                    redirectURL: "/signup",
                };
            }

            const OTP = generateOTP();
            console.log('otp:',OTP)
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);
            const existingOtp = await this._otpRepository.findByEmail(email);

            if (existingOtp) {
                await this._otpRepository.updateOtp(email, { otp: OTP, expiresAt: otpExpiration });
            } else {
                await this._otpRepository.createOtp({ email, otp: OTP, expiresAt: otpExpiration });
            }

            await sendEmail(email, "Your OTP for Password Reset", `Your OTP for verification is: ${OTP}`);

            return {
                success: true,
                message: "OTP sent to your email. Please verify.",
                data: email,
                redirectURL: "/otp-verification",
            };
        } catch (error) {
            console.error("Error in forgotPassword:", error);
            return {
                success: false,
                message: "An error occurred. Please try again later.",
            };
        }
    }

    // resetPassword 
    async resetPassword(email: string, newPassword: string, confirmNewPassword: string): Promise<IResponse> {
        try {
            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!newPassword?.trim()) throw new CustomError('Password is required', 400, 'password');
            if (!confirmNewPassword?.trim()) throw new CustomError('Confirm Password is required', 400, 'confirmPassword');

            const existingUser = await this._userRepository.findByEmail(email);

            if (!existingUser || !existingUser.isVerified) {
                return {
                    success: false,
                    message: "User not found or not verified",
                };
            }

            validatePassword(newPassword);
            if (newPassword !== confirmNewPassword) {
                throw new CustomError('Passwords do not match', 400, 'confirmPassword');
            }

            const hashedPassword = await hashPassword(newPassword.trim());
            await this._userRepository.updatePassword(email, hashedPassword);

            return {
                success: true,
                message: "Password reset successful",
                redirectURL: "/login",
            };
        } catch (error) {
            console.error("Error occurred in password reset:", error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    data: error.field ? { [error.field]: error.message } : undefined,
                };
            }
            return {
                success: false,
                message: "An error occurred. Please try again later",
            };
        }
    }

    // updateStudentProfile 
    async updateStudentProfile(email: string, profileData: Partial<UserDoc>): Promise<IResponse> {
        try {
            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!profileData.name?.trim()) throw new CustomError('Name is required', 400, 'name');
            validateName(profileData.name);
            if (profileData.profile?.dob) {
                validateDOB(profileData.profile.dob);
            }

            const existingUser = await this._userRepository.findByEmail(email);

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            const updatedData = {
                name: profileData.name || existingUser.name,
                profile: {
                    ...existingUser.profile,
                    profilePic: profileData.profile?.profilePic || existingUser.profile?.profilePic,
                },
                studentDetails: {
                    ...existingUser.studentDetails,
                    additionalEmail: profileData.studentDetails?.additionalEmail || existingUser.studentDetails?.additionalEmail,
                }
            };

            const updatedUser = await this._userRepository.updateStudentProfile(email, updatedData);

            return {
                success: true,
                message: "Profile updated successfully.",
                data: updatedUser,
            };
        } catch (error) {
            console.error("Error updating user profile:", error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    error: {
                        message: error.message,
                        field: error.field,
                        statusCode: error.statusCode
                    }
                };
            }
            return {
                success: false,
                message: "An error occurred while updating the profile.",
                error: {
                    message: "An error occurred while updating the profile."
                }
            };
        }
    }

    // changePassword 
    async changePassword(
        email: string,
        passwordData: { currentPassword: string; newPassword: string }
    ): Promise<IResponse> {
        try {
            const { currentPassword, newPassword } = passwordData;

            if (!currentPassword?.trim()) {
                throw new CustomError('Current password is required', 400, 'currentPassword');
            }
            if (!newPassword?.trim()) {
                throw new CustomError('New password is required', 400, 'newPassword');
            }

            validatePassword(newPassword);

            const user = await this._userRepository.findByEmail(email);
            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                };
            }

            const isPasswordValid = await this._userRepository.validatePassword(email, currentPassword, comparePassword);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: 'Current password is incorrect',
                    data: { currentPassword: 'Current password is incorrect' },
                };
            }

            if (await comparePassword(newPassword, user.password)) {
                return {
                    success: false,
                    message: 'New password cannot be the same as current password',
                    data: { newPassword: 'New password cannot be the same as current password' },
                };
            }

            const hashedPassword = await hashPassword(newPassword.trim());
            await this._userRepository.updatePassword(email, hashedPassword);

            return {
                success: true,
                message: 'Password updated successfully',
            };
        } catch (error) {
            console.error('Change Password Error:', error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    data: error.field ? { [error.field]: error.message } : undefined,
                };
            }
            return { success: false, message: 'An unexpected error occurred' };
        }
    }

    // googleAuth 
    async googleAuth(googleUser: { email: string, name: string }, res: Response): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findByEmail(googleUser.email);

            let user;
            if (!existingUser) {
                const randomPassword = crypto.randomBytes(16).toString('hex');
                const hashedPassword = await hashPassword(randomPassword);

                user = await this._userRepository.createUser({
                    email: googleUser.email,
                    name: googleUser.name,
                    isVerified: true,
                    password: hashedPassword,
                    isGoogleAuth: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isBlocked: false,
                    role: 'Student'
                });
            } else {
                if (!existingUser.isGoogleAuth) {
                    await this._userRepository.updateToGoogleAuth(googleUser.email);
                }
                user = existingUser;
            }

            const token = generateToken(user);
            const refreshToken = generateRefreshToken(user);

            res.cookie(Cookie.userJWT, token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
            });

            return {
                success: true,
                message: "Google authentication successful",
                token: token,
                refreshToken: refreshToken,
                userData: user
            };
        } catch (error) {
            console.error("Google Authentication Service Error:", error);
            return {
                success: false,
                message: "Failed to authenticate with Google"
            };
        }
    }

    // applyForInstructor
    async applyForInstructor(data: Partial<UserDoc>): Promise<IResponse> {
        try {
            const { name, email, profile, aboutMe, cv, phone, qualification, experience, socialMedia } = data;

            if (!name?.trim()) throw new CustomError("Name is required", 400, "name");
            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!profile?.gender) throw new CustomError("Gender is required", 400, "gender");
            if (!profile?.profilePic) throw new CustomError("Profile picture is required", 400, "profile picture");
            if (!profile?.dob) throw new CustomError("Date of birth is required", 400, "dob");
            if (profile.dob) validateDOB(profile.dob);
            if (!phone) throw new CustomError("Phone number is required", 400, "phone");
            if (data.phone) validateMobileNumber(`${data.phone}`);
            if (!aboutMe?.trim()) throw new CustomError("About Me section is required", 400, "aboutMe");
            if (!cv?.trim()) throw new CustomError("CV is required", 400, "cv");
            if (!qualification?.trim()) throw new CustomError("Qualification is required", 400, "qualification");
            if (!experience?.trim()) throw new CustomError("Experience is required", 400, "experience");

            const existingUser = await this._userRepository.findByEmail(email);

            if (!existingUser) {
                throw new CustomError("User not found", 404, "email");
            }

            if (existingUser.isRequested) {
                return {
                    success: false,
                    message: "You have already applied for an instructor position.",
                };
            }

            await this._userRepository.submitInstructorApplication(email, {
                profile,
                aboutMe,
                cv,
                phone,
                qualification,
                experience,
                socialMedia,
                isRequested: true,
                isRejected: false,
            });

            return {
                success: true,
                message: "Application submitted successfully. Awaiting approval.",
            };
        } catch (error) {
            console.error("Error submitting application", error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    error: {
                        message: error.message,
                        field: error.field,
                        statusCode: error.statusCode
                    }
                };
            }
            return {
                success: false,
                message: "An error occurred while applying.",
                error: {
                    message: "An error occurred while applying."
                }
            };
        }
    }

    // updateInstructorProfile
    async updateInstructorProfile(email: string, profileData: Partial<UserDoc>): Promise<IResponse> {
        try {
            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!profileData.name?.trim()) throw new CustomError('Name is required', 400, 'name');
            validateName(profileData.name);
            if (profileData.profile?.dob) {
                validateDOB(profileData.profile.dob);
            }

            const existingUser = await this._userRepository.findByEmail(email);

            if (!existingUser) {
                return {
                    success: false,
                    message: "Instructor not found.",
                };
            }

            const updatedData = {
                name: profileData.name || existingUser.name,
                qualification: profileData.qualification || existingUser.qualification,
                profile: {
                    ...existingUser.profile,
                    profilePic: profileData.profile?.profilePic || existingUser.profile?.profilePic,
                    dob: profileData.profile?.dob || existingUser.profile?.dob,
                    gender: profileData.profile?.gender || existingUser.profile?.gender,
                },
                instructorDetails: {
                    ...existingUser.instructorDetails,
                }
            };

            const updatedUser = await this._userRepository.updateInstructorProfile(email, updatedData);

            return {
                success: true,
                message: "Instructor profile updated successfully.",
                data: updatedUser,
            };
        } catch (error) {
            console.error("Error updating user profile:", error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    error: {
                        message: error.message,
                        field: error.field,
                        statusCode: error.statusCode
                    }
                };
            }
            return {
                success: false,
                message: "An error occurred while updating the profile.",
                error: {
                    message: "An error occurred while updating the profile."
                }
            };
        }
    }
}