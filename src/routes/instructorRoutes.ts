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
import { redisService} from "../services/redisService";
import UserController from "../controllers/userController";
import OtpRepository from "../repositories/otpRepository";
import PaymentRepository from "../repositories/paymentRepository";
import PaymentService from "../services/paymentServices";

const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const courseRepository = new CourseRepository();
const categoryRepository=new CategoryRepository()
const enrollmentRepository = new EnrollmentRepository(redisService)
const paymentRepository = new PaymentRepository()


const userService = new UserService(userRepository, otpRepository);
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository);
const courseService = new CourseService(courseRepository,categoryRepository);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository,redisService);
const courseController = new CourseController(courseService,enrollCourseService);
const userController = new UserController(userService, paymentService);


const instructorRouter = Router();

instructorRouter.post(
    INSTRUCTOR_ROUTES.CREATE_COURSE,
    authenticateUser("Instructor"), 
    uploadCourseFiles,              
    courseController.createCourse.bind(courseController) 
);
instructorRouter.get(INSTRUCTOR_ROUTES.GET_ALL_COURSES_BYINSTRUCTOR,authenticateUser("Instructor"),courseController.getAllCoursesByInstructor.bind(courseController))
instructorRouter.get(INSTRUCTOR_ROUTES.GET_COURSE_BYINSTRUCTOR,authenticateUser("Instructor"),courseController.getCourseByInstructor.bind(courseController))
instructorRouter.put(INSTRUCTOR_ROUTES.EDIT_COURSE, authenticateUser("Instructor"),uploadCourseFiles, courseController.editCourse.bind(courseController));
instructorRouter.get(INSTRUCTOR_ROUTES.GET_TRANSACTIONS,authenticateUser("Instructor"),userController.getInstructorPayouts.bind(userController))

export default instructorRouter;