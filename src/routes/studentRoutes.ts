import { RequestHandler, Router } from "express";
import UserController from "../controllers/userController";
import UserRepository from "../repositories/userRepository";
import { CourseRepository } from "../repositories/courseRepository";
import { UserService } from "../services/userServices";
import OtpRepository from "../repositories/otpRepository";
import { authenticateUser } from "../middlewares/authMiddleware";
import PaymentService from "../services/paymentServices";
import PaymentRepository from "../repositories/paymentRepository";
import AssessmentController from "../controllers/assessmentController";
import { EnrollmentRepository } from "../repositories/enrollmentRepository";
import { AssessmentRepository } from "../repositories/assessmentRepository";
import { AssessmentService } from "../services/assessmentService";
import EnrollCourseService from "../services/enrollmentServices";
import EnrollCourseController from "../controllers/enrollCourseController";
import ReviewRepository from "../repositories/reviewRepository";
import { ReviewService } from "../services/reviewServices";
import ReviewController from "../controllers/reviewController";
import { STUDENT_ROUTES } from "../constants/routes_constants";
import { Role } from "../utils/Enum";
import { redisService } from "../services/redisService";
import { CouponRepository } from "../repositories/couponRepository";
import { CouponUsageRepository } from "../repositories/couponUsageRepository";
import { SubscriptionRepository } from "../repositories/subscriptionRepository";
import { SubscriptionController } from "../controllers/subscriptionController";
import {ExamController} from "../controllers/examController"; 
import { ExamRepository } from "../repositories/examRepository";
import { ExamService } from "../services/examService";
import { NotificationService } from "../services/notificationService";
import { NotificationRepository } from "../repositories/notificationRepository";

const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const courseRepository = new CourseRepository();
const paymentRepository = new PaymentRepository();
const enrollmentRepository = new EnrollmentRepository(redisService);
const assessmentRepository = new AssessmentRepository();
const reviewRepository = new ReviewRepository();
const couponRepository = new CouponRepository()
const couponUsageRepository = new CouponUsageRepository()
const subscriptionRepository = new SubscriptionRepository()
const examRepository = new ExamRepository(redisService);
const notificationRepository=new NotificationRepository()


const userService = new UserService(userRepository, otpRepository);
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository, couponRepository, couponUsageRepository, subscriptionRepository);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository, paymentRepository);
const reviewService = new ReviewService(reviewRepository, enrollmentRepository);
const notificationService=new NotificationService(notificationRepository,enrollmentRepository)
const assessmentService = new AssessmentService(assessmentRepository, enrollmentRepository,notificationService,courseRepository);
const examService = new ExamService(examRepository, enrollmentRepository, redisService,notificationService,courseRepository); 


const userController = new UserController(userService, paymentService);
const enrollCourseController = new EnrollCourseController(enrollCourseService);
const reviewController = new ReviewController(reviewService);
const assessmentController = new AssessmentController(assessmentService);
const subscriptionController = new SubscriptionController(paymentService)
const examController = new ExamController(examService);

const studentRouter = Router();

studentRouter.post(STUDENT_ROUTES.CREATE_PAYMENT_INTENT, authenticateUser(),
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

studentRouter.get(STUDENT_ROUTES.GET_REVIEW, reviewController.getReviewsByCourse.bind(reviewController) as RequestHandler);

studentRouter.post(
  STUDENT_ROUTES.UPDATE_LESSON_PROGRESS,
  authenticateUser(),
  enrollCourseController.updateLessonProgress.bind(enrollCourseController)
);

studentRouter.get(
  STUDENT_ROUTES.GET_LESSON_PROGRESS,
  authenticateUser(),
  enrollCourseController.getLessonProgress.bind(enrollCourseController)
);

studentRouter.get(
  STUDENT_ROUTES.GET_ASSESSMENTS_FOR_STUDENT,
  authenticateUser("Student"),
  assessmentController.getAssessmentsForStudent.bind(assessmentController)
);

// studentRouter.get(
//   STUDENT_ROUTES.GET_ASSESSMENT_BY_ID,
//   authenticateUser("Student"),
//   assessmentController.getAssessmentById.bind(assessmentController)
// );

studentRouter.post(
  STUDENT_ROUTES.SUBMIT_ASSESSMENT,
  authenticateUser("Student"),
  assessmentController.submitAssessment.bind(assessmentController)
);

studentRouter.get(
  STUDENT_ROUTES.GET_ASSESSMENT_RESULT,
  authenticateUser("Student"),
  assessmentController.getAssessmentResult.bind(assessmentController)
);


studentRouter.get(
  STUDENT_ROUTES.GET_ASSESSMENT_BY_ID_FOR_STUDENT,
  authenticateUser("Student"),
  assessmentController.getAssessmentByIdForStudent.bind(assessmentController)
)

studentRouter.get(STUDENT_ROUTES.GET_COURSE_PROGRESS, authenticateUser("Student"), assessmentController.getCourseProgress.bind(assessmentController));
studentRouter.get(STUDENT_ROUTES.GET_ASSESSMENTS_BY_COURSE, authenticateUser("Student"), assessmentController.getAllAssessmentsForCourse.bind(assessmentController))
export default studentRouter;


studentRouter.post(STUDENT_ROUTES.CREATE_SUBSCRIPTION, authenticateUser("Student"), subscriptionController.createSubscription.bind(subscriptionController))
studentRouter.post(STUDENT_ROUTES.CONFIRM_SUBSCRIPTION, authenticateUser('Student'), subscriptionController.confirmSubscription.bind(subscriptionController))
studentRouter.get(STUDENT_ROUTES.GET_SUBSCRIPTION_STATUS, authenticateUser(), subscriptionController.getSubscriptionStatus.bind(subscriptionController))


studentRouter.get(
  STUDENT_ROUTES.GET_EXAMS_FOR_STUDENT,
  authenticateUser("Student"),
  examController.getExamsForStudent.bind(examController)
);
studentRouter.get(
  STUDENT_ROUTES.GET_EXAM_BY_ID_FOR_STUDENT,
  authenticateUser("Student"),
  examController.getExamByIdForStudent.bind(examController)
);
studentRouter.post(
  STUDENT_ROUTES.START_EXAM,
  authenticateUser("Student"),
  examController.startExam.bind(examController)
);
studentRouter.post(
  STUDENT_ROUTES.SUBMIT_EXAM,
  authenticateUser("Student"),
  examController.submitExam.bind(examController)
);
studentRouter.get(
  STUDENT_ROUTES.GET_EXAM_RESULT,
  authenticateUser("Student"),
  examController.getExamResult.bind(examController)
);

studentRouter.get(STUDENT_ROUTES.GET_EXAM_PROGRESS,authenticateUser("Student"),examController.getExamProgress.bind(examController))