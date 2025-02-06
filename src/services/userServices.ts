import UserRepository from '../repositories/userRepository';
import OtpRepository from "../repositories/otpRepository";
import { IUserService } from '../interfaces/IServices';
import { IResponse } from '../interfaces/IResponse';
import { UserDoc } from '../interfaces/IUser';
import { hashPassword } from '../utils/bcrypt';
import { CustomError } from '../utils/CustomError';
import { generateOTP } from '../utils/OTPGenerator';
import { sendEmail } from '../utils/nodemailer';
import { generateToken, generateRefreshToken } from '../utils/jwt';

export class UserService implements IUserService {
    constructor(
        private _userRepository: UserRepository,
        private _otpRepository: OtpRepository
    ) {
        this._userRepository = _userRepository;
        this._otpRepository = _otpRepository;
    }


    //sigup user
    async signupUser(data: Partial<UserDoc>): Promise<IResponse> {
        try {
            if (!data.name?.trim()) {
                throw new CustomError('Name is required', 400, 'name');
            }
            if (!data.password?.trim()) {
                throw new CustomError('Password is required', 400, 'password');
            }

            const { name, email, password } = data;

            if (!email) {
                throw new CustomError("Email is required", 400, "email");
            }

            const existingUser = await this._userRepository.findByQuery({ email });
            if (existingUser?.isVerified) {
                throw new CustomError('Email already exists', 400, 'email');
            }

            const hashedPassword = await hashPassword(password.trim());
            let user;

            if (existingUser) {
                user = await this._userRepository.update(
                    { email },
                    {
                        name,
                        password: hashedPassword,
                        isVerified: false
                    }
                );
            } else {
                user = await this._userRepository.create({
                    name,
                    email,
                    password: hashedPassword,
                    isVerified: false,
                });
            }

            const OTP = generateOTP();
            const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);

            const existingOtp = await this._otpRepository.findByQuery({ email });

            if (existingOtp) {
                await this._otpRepository.update(
                    { email },
                    {
                        otp: OTP,
                        expiresAt: otpExpiration,
                    }
                );
            } else {
                await this._otpRepository.create({
                    email,
                    otp: OTP,
                    userData: {
                        name,
                        password: hashedPassword,
                    },
                    expiresAt: otpExpiration,
                });
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
            throw error;
        }
    }


    //verify user
    async verifyOtp({ email, otp }: { email: string; otp: Number }): Promise<IResponse> {
        try {
            const otpData = await this._otpRepository.findByQuery({ email });
            if (!otpData) {
                return {
                    success: false,
                    message: "No OTP found for this email.",
                };
            }
            if (otpData.otp !== otp) {
                return {
                    success: false,
                    message: "Invalid OTP.",
                };
            }
            const currentTime = new Date();
            if (currentTime > otpData.expiresAt) {
                await this._otpRepository.update({ _id: otpData._id }, { otp: null });
                return {
                    success: false,
                    message: "OTP expired.Resend otp.",
                };
            }

            if (!otpData.userData || !otpData.userData.name || !otpData.userData.password) {
                return {
                    success: false,
                    message: "User data not found. Please try signing up again.",
                };
            }

            await this._userRepository.update({ email }, { isVerified: true });
            await this._otpRepository.delete(otpData._id);

            const user = await this._userRepository.findByQuery({ email });
            const token = generateToken(user);
            const refreshToken = generateRefreshToken(user);

            return {
                success: true,
                message: "OTP verified successfully. Your account is now activated.",
                redirectURL: "/",
                token:token,
                refreshToken:refreshToken
            };
        } catch (error) {
            console.error("Error during OTP verification:", error);
            return {
                success: false,
                message: "OTP verification failed. Please try again.",
            };
        }
    }
}