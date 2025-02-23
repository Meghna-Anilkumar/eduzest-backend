import { Request, Response, NextFunction } from "express";
import { UserService } from '../services/userServices'
import { Status } from "../utils/enums";
import { Cookie } from "../interfaces/IEnums";
import { OAuth2Client } from 'google-auth-library';
// import { validatePassword } from "../utils/validator";

class UserController {
    constructor(private _userService: UserService) {
        this._userService = _userService

    }

    async signupUser(req: Request, res: Response) {
        try {
            const result = await this._userService.signupUser(req.body);
            res.status(Status.CREATED).json({
                status: result.success,
                message: result.message,
                data: result.data,
            });
        } catch (error) {
            res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
        }
    }

    async verifyOtp(req: Request, res: Response) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: "Email and OTP are required.",
                });
            }

            const result = await this._userService.verifyOtp({ email, otp }, res);

            res.status(result.success ? Status.OK : Status.BAD_REQUEST).json({
                success: result.success,
                message: result.message,
                token: result.token,
                refreshToken: result.refreshToken,
                userData: result.userData,
                redirectURL: result.redirectURL
            });

        } catch (error) {
            console.error("Error during OTP verification:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }

    async userLogin(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: "Email and password are required.",
                });
            }

            const result = await this._userService.userLogin({ email, password }, res);

            res.status(result.success ? Status.OK : Status.BAD_REQUEST).json({
                success: result.success,
                message: result.message,
                token: result.token,
                refreshToken: result.refreshToken,
                userData: result.userData
            });

        } catch (error) {
            console.error("Error during login:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }



    //get user data
    async getUser(req: Request, res: Response): Promise<void> {
        try {
            let token = req.cookies.userJWT; 
    
            if (!token) {
                res.status(Status.UN_AUTHORISED).json({
                    success: false,
                    message: "Authorization token is required",
                });
                return;
            }
    
            const result = await this._userService.getUser(token);
            res.status(Status.OK).json(result);
        } catch (error) {
            console.error("Error fetching user data:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            res.clearCookie(Cookie.userJWT, {
                httpOnly: true,
            });

            return res.status(Status.OK).json({
                status: "Success",
                message: "User logged out successfully",
            });
        } catch (error) {
            next(error);
        }
    }


    async resendOtp(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: "Email is required.",
                });
            }

            const result = await this._userService.resendOtp(email);

            res.status(result.success ? Status.OK : Status.BAD_REQUEST).json({
                success: result.success,
                message: result.message,
            });

        } catch (error) {
            console.error("Error resending OTP:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: "Email is required.",
                });
            }

            const result = await this._userService.forgotPassword(email);

            return res.status(result.success ? Status.OK : Status.BAD_REQUEST).json({
                success: result.success,
                message: result.message,
                data: result.data,
                redirectURL: result.redirectURL || undefined,
            });

        } catch (error) {
            console.error("Error in forgotPassword:", error);
            next(error);
        }
    }


    //reset password
    async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email, newPassword, confirmNewPassword } = req.body;

            const result = await this._userService.resetPassword(email, newPassword, confirmNewPassword);

            if (result.success) {
                res.status(Status.OK).json({
                    success: true,
                    message: result.message,
                    redirectURL: result.redirectURL,
                });
            } else {
                res.status(Status.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: result.message || "Failed to reset password. Please try again later.",
                });
            }
        } catch (error) {
            console.error("Error in resetPassword:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An unexpected error occurred. Please try again later.",
            });
        }
    }



    //update student profile
    async updateStudentProfile(req: Request, res: Response) {
        try {
          const { email, username, additionalEmail, dob, gender } = req.body;
          let imageUrl = req.file?.path; 
      
          const updatedData = {
            name: username,
            studentDetails: { additionalEmail },
            profile: { dob, gender, profilePic: imageUrl },
          };
      
          const result = await this._userService.updateStudentProfile(email, updatedData);
          res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
          res.status(500).json({ success: false, message: "Internal Server Error" });
        }
      }



    //change password
    async changePassword(req: Request, res: Response) {
        try {
            const { email, currentPassword, newPassword } = req.body;
            console.log(req.body)
            if (!email || !currentPassword || !newPassword) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: 'Email, current password, and new password are required',
                });
            }

            const result = await this._userService.changePassword(email, {
                currentPassword,
                newPassword,
            });

            res.status(result.success ? Status.OK : Status.BAD_REQUEST).json({
                success: result.success,
                message: result.message,
                data: result.data,
            });
        } catch (error) {
            console.error('Error changing password:', error);
            return res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal Server Error',
            });
        }
    }


    //google auth
    async googleAuth(req: Request, res: Response) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: "Google token is required"
                });
            }

            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return res.status(Status.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid Google token"
                });
            }

            const username = payload.email.split('@')[0];

            const googleUser = {
                email: payload.email,
                name: payload.name || '',
                username: username,
            };

            const result = await this._userService.googleAuth(googleUser, res);

            res.status(result.success ? Status.OK : Status.BAD_REQUEST).json({
                success: result.success,
                message: result.message,
                token: result.token,
                refreshToken: result.refreshToken,
                userData: result.userData
            });

        } catch (error) {
            console.error("Google Authentication Error:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal Server Error during Google authentication"
            });
        }
    }



    //apply for instructor 
    async applyForInstructor(req: Request, res: Response) {
        try {
          const { name, email, gender, dob, phone, qualification, aboutMe } = req.body;
          const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
          console.log("Received files:", files); // Debug log
      
          if (!files || !files["profilePic"]?.[0]) {
            return res.status(400).json({
              success: false,
              message: "Profile picture is required"
            });
          }
      
          const profilePicUrl = files["profilePic"][0].path;
          const cvUrl = files["cv"]?.[0]?.path;
      
          if (!cvUrl) {
            return res.status(400).json({
              success: false,
              message: "CV is required"
            });
          }
      
          const applicationData = {
            name,
            email,
            profile: {
              gender,
              dob,
              profilePic: profilePicUrl
            },
            aboutMe,
            cv: cvUrl,
            phone,
            qualification
          };
      
          console.log("Application data:", applicationData); // Debug log
      
          const result = await this._userService.applyForInstructor(applicationData);
      
          res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
          console.error("Instructor Application Error:", error);
          res.status(500).json({
            success: false,
            message: "Internal Server Error"
          });
        }
      }
    






}






export default UserController;