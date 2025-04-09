import { RequestHandler, Router } from "express";
import UserController from "../controllers/userController";
import UserRepository from "../repositories/userRepository";
import { CourseRepository } from "../repositories/courseRepository";
import CourseService from "../services/courseServices";
import { UserService } from "../services/userServices";
import OtpRepository from "../repositories/otpRepository";
import { authenticateUser } from "../middlewares/authMiddleware";
import PaymentService from "../services/paymentServices";
import PaymentRepository from "../repositories/paymentRepository";
import {EnrollmentRepository} from "../repositories/enrollmentRepository";
import CategoryRepository from "../repositories/categoryRepository";
import EnrollCourseService from "../services/enrollmentServices";
import EnrollCourseController from "../controllers/enrollCourseController";
import ReviewRepository from "../repositories/reviewRepository"; 
import { ReviewService } from "../services/reviewServices";
import ReviewController from "../controllers/reviewController";
import { STUDENT_ROUTES } from "../constants/routes_constants";
import { Role } from "../interfaces/IEnums";


const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const courseRepository = new CourseRepository();
const paymentRepository = new PaymentRepository();
const enrollmentRepository = new EnrollmentRepository();
const categoryRepository = new CategoryRepository();
const reviewRepository = new ReviewRepository();


const userService = new UserService(userRepository, otpRepository);
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository);
const courseService = new CourseService(courseRepository,categoryRepository);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository);
const reviewService = new ReviewService(reviewRepository, enrollmentRepository); 


const userController = new UserController(userService, paymentService);
const enrollCourseController = new EnrollCourseController(enrollCourseService);
const reviewController = new ReviewController(reviewService); 

const studentRouter = Router();

studentRouter.post(STUDENT_ROUTES.CREATE_PAYMENT_INTENT,authenticateUser(),
  userController.createPaymentIntent.bind(userController) as RequestHandler
);

studentRouter.post(
  STUDENT_ROUTES.CONFIRM_PAYMENT,
  authenticateUser(),
  userController.confirmPayment.bind(userController)
);

studentRouter.post(
  STUDENT_ROUTES.ENROLL_COURSE,
  authenticateUser(),
  enrollCourseController.enrollFreeCourse.bind(enrollCourseController)
);

studentRouter.get(
  STUDENT_ROUTES.CHECK_ENROLLMENT,
  authenticateUser(Role.student),
  enrollCourseController.checkEnrollment.bind(enrollCourseController)
);


studentRouter.get(
  STUDENT_ROUTES.GET_ENROLLMENTS,
  authenticateUser(Role.student),
  enrollCourseController.getEnrollmentsByUserId.bind(enrollCourseController)
);

studentRouter.get(
  STUDENT_ROUTES.GET_PAYMENT_HISTORY,
  authenticateUser(Role.student),
  userController.getPaymentHistory.bind(userController) as RequestHandler
);

studentRouter.post(
  STUDENT_ROUTES.ADD_REVIEW,
  authenticateUser(),
  reviewController.addReview.bind(reviewController)
);

export default studentRouter;