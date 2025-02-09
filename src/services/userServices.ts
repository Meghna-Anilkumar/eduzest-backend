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
import { error } from 'console';

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
                    message: "Invalid email. Please sign up first.",
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
                await this._userRepository.update({email} , {password: hashedPassword});
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





}    