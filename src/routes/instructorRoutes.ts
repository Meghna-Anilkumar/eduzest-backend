import { INSTRUCTOR_ROUTES } from "../constants/routes_constants";
import CourseController from "../controllers/courseController";
import { CourseRepository } from "../repositories/courseRepository";
import { CourseService } from "../services/courseServices";
import { RequestHandler, Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import { uploadCourseFiles } from "../config/multerConfig"; 
import CategoryRepository from "../repositories/categoryRepository";
import EnrollCourseService from "../services/enrollmentServices";
import { EnrollmentRepository } from "../repositories/enrollmentRepository";
import { UserService } from "../services/userServices";
import UserRepository from "../repositories/userRepository";

const userRepository = new UserRepository();
const courseRepository = new CourseRepository();
const categoryRepository=new CategoryRepository()
const enrollmentRepository = new EnrollmentRepository()
const courseService = new CourseService(courseRepository,categoryRepository);
const enrollCourseService = new EnrollCourseService(enrollmentRepository, userRepository, courseRepository);
const courseController = new CourseController(courseService,enrollCourseService);

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
export default instructorRouter;