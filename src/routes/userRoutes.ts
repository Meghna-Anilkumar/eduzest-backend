import { RequestHandler, Router } from "express";
import UserController from "../controllers/userController";
import UserRepository from "../repositories/userRepository";
import { UserService } from "../services/userServices";
import OtpRepository from "../repositories/otpRepository";
import { USER_ROUTES } from "../constants/routes_constants";
import {
    uploadToS3Single,
    uploadToS3Multiple
} from '../config/multerConfig';
import { authenticateUser } from "../middlewares/authMiddleware";

const userRepository = new UserRepository();
const otpRepository = new OtpRepository();

const userService = new UserService(userRepository, otpRepository);
const userController = new UserController(userService);

const userRouter = Router();

userRouter.post(USER_ROUTES.SIGNUP, userController.signupUser.bind(userController))
userRouter.post(USER_ROUTES.OTP_VERIFY, userController.verifyOtp.bind(userController) as RequestHandler);
userRouter.post(USER_ROUTES.LOGIN, userController.userLogin.bind(userController) as RequestHandler)
userRouter.get(USER_ROUTES.GET_USER, authenticateUser(), userController.getUser.bind(userController) as RequestHandler)
userRouter.post(USER_ROUTES.LOGOUT, userController.logout.bind(userController) as RequestHandler)
userRouter.post(USER_ROUTES.RESEND_OTP, userController.resendOtp.bind(userController) as RequestHandler)
userRouter.post(USER_ROUTES.FORGOT_PASS, userController.forgotPassword.bind(userController) as RequestHandler)
userRouter.post(USER_ROUTES.RESET_PASS, userController.resetPassword.bind(userController) as RequestHandler)
userRouter.put(
    USER_ROUTES.STUDENT_PROFILE,authenticateUser(),
    uploadToS3Single.single("profilePic"),
    userController.updateStudentProfile.bind(userController) as RequestHandler
); 
userRouter.put(USER_ROUTES.CHANGE_PASSWORD, userController.changePassword.bind(userController) as RequestHandler)
userRouter.post(USER_ROUTES.GOOGLE_AUTH, userController.googleAuth.bind(userController) as RequestHandler)
userRouter.post(
    USER_ROUTES.INSTRUCTOR_APPLY,
    uploadToS3Multiple,
    userController.applyForInstructor.bind(userController) as RequestHandler
);
userRouter.put(
    USER_ROUTES.INSTRUCTOR_PROFILE,
    uploadToS3Single.single("profilePic"),
    userController.updateInstructorProfile.bind(userController) as RequestHandler
);
userRouter.post(USER_ROUTES.REFRESH_TOKEN, userController.refreshToken.bind(userController) as RequestHandler);

export default userRouter   