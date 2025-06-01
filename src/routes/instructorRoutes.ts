import { INSTRUCTOR_ROUTES } from "../constants/routes_constants";
import CourseController from "../controllers/courseController";
import { CourseRepository } from "../repositories/courseRepository";
import { CourseService } from "../services/courseServices";
import { Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import { uploadCourseFiles } from "../config/multerConfig";
import CategoryRepository from "../repositories/categoryRepository";
import EnrollCourseService from "../services/enrollmentServices";
import { EnrollmentRepository } from "../repositories/enrollmentRepository";
import { UserService } from "../services/userServices";
import UserRepository from "../repositories/userRepository";
import { redisService } from "../services/redisService";
import UserController from "../controllers/userController";
import OtpRepository from "../repositories/otpRepository";
import PaymentRepository from "../repositories/paymentRepository";
import PaymentService from "../services/paymentServices";
import AssessmentController from "../controllers/assessmentController";
import { AssessmentService } from "../services/assessmentService";
import { AssessmentRepository } from "../repositories/assessmentRepository";
import EnrollCourseController from "../controllers/enrollCourseController";
import { CouponRepository } from "../repositories/couponRepository";
import { CouponUsageRepository } from "../repositories/couponUsageRepository";
import { OfferService } from "../services/offerService";
import { OfferRepository } from "../repositories/offerRepository";
import { SubscriptionRepository } from "../repositories/subscriptionRepository";

// Instantiate repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const courseRepository = new CourseRepository();
const categoryRepository = new CategoryRepository();
const enrollmentRepository = new EnrollmentRepository(redisService);
const paymentRepository = new PaymentRepository();
const assessmentRepository = new AssessmentRepository();
const couponRepository=new CouponRepository()
const couponUsageRepository=new CouponUsageRepository()
const offerRepository=new OfferRepository()
const subscriptionRepository=new SubscriptionRepository()

// Instantiate services
const userService = new UserService(userRepository, otpRepository);
const offerService=new OfferService(offerRepository,categoryRepository,courseRepository)
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository,couponRepository,couponUsageRepository,subscriptionRepository);
const courseService = new CourseService(courseRepository, categoryRepository,offerService);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository, paymentRepository);
const assessmentService = new AssessmentService(assessmentRepository, enrollmentRepository);

// Instantiate controllers
const courseController = new CourseController(courseService, enrollCourseService);
const userController = new UserController(userService, paymentService);
const assessmentController = new AssessmentController(assessmentService);
const enrollCourseController = new EnrollCourseController(enrollCourseService)

// Create instructor router
const instructorRouter = Router();

instructorRouter.post(
    INSTRUCTOR_ROUTES.CREATE_COURSE,
    authenticateUser("Instructor"),
    uploadCourseFiles,
    courseController.createCourse.bind(courseController)
);

instructorRouter.get(
    INSTRUCTOR_ROUTES.GET_ALL_COURSES_BYINSTRUCTOR,
    authenticateUser("Instructor"),
    courseController.getAllCoursesByInstructor.bind(courseController)
);

instructorRouter.get(
    INSTRUCTOR_ROUTES.GET_COURSE_BYINSTRUCTOR,
    authenticateUser("Instructor"),
    courseController.getCourseByInstructor.bind(courseController)
);

instructorRouter.put(
    INSTRUCTOR_ROUTES.EDIT_COURSE,
    authenticateUser("Instructor"),
    uploadCourseFiles,
    courseController.editCourse.bind(courseController)
);

instructorRouter.get(
    INSTRUCTOR_ROUTES.GET_TRANSACTIONS,
    authenticateUser("Instructor"),
    userController.getInstructorPayouts.bind(userController)
);

instructorRouter.post(
    INSTRUCTOR_ROUTES.CREATE_ASSESSMENT,
    authenticateUser("Instructor"),
    assessmentController.createAssessment.bind(assessmentController)
);

instructorRouter.get(
    INSTRUCTOR_ROUTES.GET_ASSESSMENTS,
    authenticateUser("Instructor"),
    assessmentController.getAssessmentsByCourseAndModule.bind(assessmentController)
);

instructorRouter.put(
    INSTRUCTOR_ROUTES.EDIT_ASSESSMENT,
    authenticateUser('Instructor'),
    assessmentController.updateAssessment.bind(assessmentController)
);

instructorRouter.delete(
    INSTRUCTOR_ROUTES.DELETE_ASSESSMENT,
    authenticateUser('Instructor'),
    assessmentController.deleteAssessment.bind(assessmentController)
);

instructorRouter.get(
    INSTRUCTOR_ROUTES.GET_COURSE_STATS,
    authenticateUser("Instructor"),
    enrollCourseController.getInstructorCourseStats.bind(enrollCourseController)
);

export default instructorRouter;
