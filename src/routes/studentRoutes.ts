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
import { STUDENT_ROUTES } from "../constants/routes_constants";

// Instantiate repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const courseRepository = new CourseRepository();
const paymentRepository = new PaymentRepository();
const enrollmentRepository = new EnrollmentRepository();
const categoryRepository = new CategoryRepository();

// Instantiate services
const userService = new UserService(userRepository, otpRepository);
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository);
const courseService = new CourseService(courseRepository,categoryRepository);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository);

// Instantiate controllers
const userController = new UserController(userService, paymentService);
const enrollCourseController = new EnrollCourseController(enrollCourseService);

const studentRouter = Router();

// Create Payment Intent (for paid courses)
studentRouter.post(STUDENT_ROUTES.CREATE_PAYMENT_INTENT,authenticateUser(),
  userController.createPaymentIntent.bind(userController) as RequestHandler
);

// Confirm Payment (for paid courses)
studentRouter.post(
  STUDENT_ROUTES.CONFIRM_PAYMENT,
  authenticateUser(),
  userController.confirmPayment.bind(userController)
);

// Enroll in a Free Course
studentRouter.post(
  STUDENT_ROUTES.ENROLL_COURSE,
  authenticateUser(),
  enrollCourseController.enrollFreeCourse.bind(enrollCourseController)
);

// Check Enrollment Status
studentRouter.get(
  STUDENT_ROUTES.CHECK_ENROLLMENT,
  authenticateUser(),
  enrollCourseController.checkEnrollment.bind(enrollCourseController)
);

// Get All Enrollments for a User
studentRouter.get(
  STUDENT_ROUTES.GET_ENROLLMENTS,
  authenticateUser(),
  enrollCourseController.getEnrollmentsByUserId.bind(enrollCourseController)
);

studentRouter.get(
  STUDENT_ROUTES.GET_PAYMENT_HISTORY,
  authenticateUser(),
  userController.getPaymentHistory.bind(userController) as RequestHandler
);

export default studentRouter;