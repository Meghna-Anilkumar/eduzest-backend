import { RequestHandler, Router } from "express";
import UserController from "../controllers/userController";
import UserRepository from "../repositories/userRepository";
import CourseController from "../controllers/courseController";
import { CourseRepository } from "../repositories/courseRepository";
import CategoryRepository from "../repositories/categoryRepository";
import CourseService from "../services/courseServices";
import { UserService } from "../services/userServices";
import OtpRepository from "../repositories/otpRepository";
import { USER_ROUTES } from "../constants/routes_constants";
import {
    uploadToS3Single,
    uploadToS3Multiple
} from '../config/multerConfig';
import { authenticateUser } from "../middlewares/authMiddleware";
import PaymentService from "../services/paymentServices";
import PaymentRepository from "../repositories/paymentRepository";
import { EnrollmentRepository } from "../repositories/enrollmentRepository";
import EnrollCourseService from "../services/enrollmentServices";
import EnrollCourseController from "../controllers/enrollCourseController";
import ReviewController from "../controllers/reviewController";
import { ReviewService } from "../services/reviewServices";
import ReviewRepository from "../repositories/reviewRepository";
import { redisService } from "../services/redisService";


const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const courseRepository = new CourseRepository();
const categoryRepository = new CategoryRepository();
const paymentRepository = new PaymentRepository()
const enrollmentRepository = new EnrollmentRepository(redisService)
const reviewRepository = new ReviewRepository();

// Instantiate services
const userService = new UserService(userRepository, otpRepository);
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository);
const courseService = new CourseService(courseRepository, categoryRepository);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository,redisService);
const reviewService = new ReviewService(reviewRepository, enrollmentRepository);

// Instantiate controllers
const userController = new UserController(userService, paymentService);
const courseController = new CourseController(courseService,enrollCourseService);
const enrollCourseController = new EnrollCourseController(enrollCourseService)
const reviewController = new ReviewController(reviewService);

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
    USER_ROUTES.STUDENT_PROFILE, authenticateUser(),
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

userRouter.get(USER_ROUTES.GET_ALL_ACTIVE_COURSES, courseController.getAllActiveCourses.bind(courseController) as RequestHandler);
userRouter.get(USER_ROUTES.GET_COURSE_BY_ID, courseController.getCourseById.bind(courseController))
userRouter.get(USER_ROUTES.GET_REVIEWS,reviewController.getReviewsByCourse.bind(reviewController)) 
userRouter.get(
    USER_ROUTES.STREAM_VIDEO,
    authenticateUser(),
    courseController.streamVideo.bind(courseController) as RequestHandler
  );

export default userRouter   