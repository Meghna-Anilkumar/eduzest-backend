import UserRepository from '../repositories/userRepository';
import OtpRepository from "../repositories/otpRepository";
import { IUserService } from '../interfaces/IServices';
import { IResponse } from '../interfaces/IResponse';
import { UserDoc } from '../interfaces/IUser';
import { hashPassword } from '../utils/bcrypt';
import { CustomError } from '../utils/CustomError';
import { generateOTP } from '../utils/OTPGenerator';
import { sendEmail } from '../utils/nodemailer';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { validateName, validateEmail, validatePassword } from '../utils/validator'
import { comparePassword } from '../utils/bcrypt';
import { Response } from 'express';
import { Cookie } from '../interfaces/IEnums';
import * as crypto from 'crypto';




export class UserService implements IUserService {
    constructor(
        private _userRepository: UserRepository,
        private _otpRepository: OtpRepository
    ) {
        this._userRepository = _userRepository;
        this._otpRepository = _otpRepository;
    }


    //sigup user
    async signupUser(data: Partial<UserDoc> & { confirmPassword?: string }): Promise<IResponse> {
        try {
            const { name, email, password, confirmPassword } = data;
            console.log(confirmPassword)
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

            const existingUser = await this._userRepository.findByQuery({ email });
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
                user = await this._userRepository.update(
                    { email },
                    { name, password: hashedPassword, isVerified: false }
                );
            } else {
                user = await this._userRepository.create({
                    name, email, password: hashedPassword, isVerified: false,
                });
            }

            const OTP = generateOTP();
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);
            const existingOtp = await this._otpRepository.findByQuery({ email });

            if (existingOtp) {
                await this._otpRepository.update({ email }, { otp: OTP, expiresAt: otpExpiration });
            } else {
                await this._otpRepository.create({ email, otp: OTP, expiresAt: otpExpiration });
            }

            console.log({ email, OTP });
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



    //verify user
    async verifyOtp(
        { email, otp }: { email: string; otp: number },
        res: Response
    ): Promise<IResponse> {
        try {
            const otpData = await this._otpRepository.findByQuery({ email });

            if (!otpData) {
                return {
                    success: false,
                    message: "No OTP found for this email.",
                };
            }

            const currentTime = new Date();
            if (currentTime > otpData.expiresAt) {
                await this._otpRepository.update({ email }, { otp: null });
                return {
                    success: false,
                    message: "OTP expired. Please request a new one.",
                };
            }

            if (otpData.otp !== otp) {
                return {
                    success: false,
                    message: "Invalid OTP.",
                };
            }

            //--------------for forgot password---------
            const existingUser = await this._userRepository.findByQuery({ email })
            if (existingUser?.isVerified) {
                return {
                    success: true,
                    message: 'otp verified.reset your password',
                    redirectURL: '/reset-password'
                }
            }
            //-------------------------------------------

            await this._userRepository.update({ email }, { isVerified: true });
            await this._otpRepository.delete(otpData._id);

            const user = await this._userRepository.findByQuery({ email });

            const token = generateToken(user);
            const refreshToken = generateRefreshToken(user);

            res.cookie(Cookie.userJWT, token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
            });

            return {
                success: true,
                message: "OTP verified successfully. Your account is now activated.",
                redirectURL: "/",
                token: token,
                refreshToken: refreshToken,
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



    //user login
    async userLogin({ email, password }: { email: string; password: string }, res: Response): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findByQuery({ email });

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            if (existingUser.isBlocked) {
                return {
                    success: false,
                    message: "Your account has been blocked. Please contact support.",
                };
            }

            if (!existingUser.isVerified) {
                return {
                    success: false,
                    message: "Invalid credentials.",
                };
            }

            const isPasswordValid = await comparePassword(password, existingUser.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: "Invalid password.",
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


    //get user data
    async getUser(token: string) {
        try {
            const payload = verifyToken(token);

            const id = JSON.parse(JSON.stringify(payload)).payload;

            const user = await this._userRepository.findById(id._id);

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


    //resend otp
    async resendOtp(email: string): Promise<IResponse> {
        try {
            if (!email) {
                throw new CustomError("Email is required", 400, "email");
            }

            const user = await this._userRepository.findByQuery({ email });

            if (!user) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            // if (user.isVerified) {
            //     return {
            //         success: false,
            //         message: "User is already verified.",
            //     };
            // }

            const OTP = generateOTP();
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);

            const existingOtp = await this._otpRepository.findByQuery({ email });

            if (existingOtp) {
                await this._otpRepository.update({ email }, { otp: OTP, expiresAt: otpExpiration });
            }

            console.log({ email, OTP });
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


    //forgot password
    async forgotPassword(email: string): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findByQuery({ email });

            if (!existingUser) {
                return {
                    success: false,
                    message: "Invalid email.Please try with your registered email.",
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
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);
            const existingOtp = await this._otpRepository.findByQuery({ email });

            if (existingOtp) {
                await this._otpRepository.update({ email }, { otp: OTP, expiresAt: otpExpiration });
            } else {
                await this._otpRepository.create({ email, otp: OTP, expiresAt: otpExpiration });
            }

            console.log({ email, OTP });
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


    //reset-password
    async resetPassword(email: string, newPassword: string, confirmNewPassword: string): Promise<IResponse> {
        try {

            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!newPassword?.trim()) throw new CustomError('Password is required', 400, 'password');
            if (!confirmNewPassword?.trim()) throw new CustomError('Confirm Password is required', 400, 'confirmPassword');

            const existingUser = await this._userRepository.findByQuery({ email });

            if (existingUser && existingUser.isVerified) {
                validatePassword(newPassword)
                if (newPassword !== confirmNewPassword) {
                    throw new CustomError('Passwords do not match', 400, 'confirmPassword')
                }
                const hashedPassword = await hashPassword(newPassword.trim());
                await this._userRepository.update({ email }, { password: hashedPassword });
                return {
                    success: true,
                    message: "Password reset successful",
                    redirectURL: "/login",
                };
            }

            return {
                success: false,
                message: "User not found or not verified",
            };
        } catch (error) {
            console.error("Error occurred in password reset:", error);
            return {
                success: false,
                message: "An error occurred. Please try again later",
            };
        }
    }


    //update student profile
    async updateStudentProfile(email: string, profileData: Partial<UserDoc>): Promise<IResponse> {
        try {
            if (!email) throw new CustomError("Email is required", 400, "email");

            const existingUser = await this._userRepository.findByQuery({ email });

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

            await this._userRepository.update({ email }, { $set: updatedData, new: true });

            return {
                success: true,
                message: "Profile updated successfully.",
                data: updatedData,
            };
        } catch (error) {
            console.error("Error updating user profile:", error);
            return {
                success: false,
                message: "An error occurred while updating the profile.",
            };
        }
    }




    //change password
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

            const user = await this._userRepository.findByQuery({ email });
            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                };
            }

            const isPasswordValid = await comparePassword(currentPassword, user.password);
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
            await this._userRepository.update({ email }, { password: hashedPassword });

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



    //google auth
    async googleAuth(googleUser: { email: string, name: string }, res: Response): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findByQuery({ email: googleUser.email });

            let user;

            if (!existingUser) {
                const randomPassword = crypto.randomBytes(16).toString('hex');
                const hashedPassword = await hashPassword(randomPassword);

                user = await this._userRepository.create({
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

                console.log("New Google user created:", user.email);
            } else {
                if (!existingUser.isGoogleAuth) {
                    await this._userRepository.update(
                        { email: googleUser.email },
                        {
                            isGoogleAuth: true,
                            updatedAt: new Date()
                        }
                    );
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
                userData: user.toObject({ getters: true })
            };
        } catch (error) {
            console.error("Google Authentication Service Error:", error);
            return {
                success: false,
                message: "Failed to authenticate with Google"
            };
        }
    }


    //instructor apply
    async applyForInstructor(data: Partial<UserDoc>): Promise<IResponse> {
        try {
            const { name, email, profile, aboutMe, cv, phone, qualification } = data;
            console.log(data)
            if (!name?.trim()) throw new CustomError("Name is required", 400, "name");
            if (!email) throw new CustomError("Email is required", 400, "email");
            if (!profile?.gender) throw new CustomError("Gender is required", 400, "gender");
            if (!profile?.profilePic) throw new CustomError("pro pic is required", 400, "profile picture");
            if (!profile?.dob) throw new CustomError("Date of birth is required", 400, "dob");
            if (!phone) throw new CustomError("Phone number is required", 400, "phone");
            if (!aboutMe?.trim()) throw new CustomError("About Me section is required", 400, "aboutMe");
            if (!cv?.trim()) throw new CustomError("CV is required", 400, "cv");
            if (!qualification?.trim()) throw new CustomError("Qualification is required", 400, "qualification");

            const existingUser = await this._userRepository.findByQuery({ email });

            if (!existingUser) {
                throw new CustomError("User not found", 404, "email");
            }

            if (existingUser.isRequested) {
                return {
                    success: false,
                    message: "You have already applied for an instructor position.",
                };
            }

            await this._userRepository.update(
                { email },
                {
                    profile,
                    aboutMe,
                    cv,
                    qualification,
                    isRequested: true,
                    isRejected: false,
                }
            );

            return {
                success: true,
                message: "Application submitted successfully. Awaiting approval.",
            };
        } catch (error) {
            console.error("Error during instructor application:", error);
            return {
                success: false,
                message: error instanceof CustomError ? error.message : "An unexpected error occurred.",
            };
        }
    }


}    