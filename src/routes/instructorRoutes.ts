import { INSTRUCTOR_ROUTES } from "../constants/routes_constants";
import CourseController from "../controllers/courseController";
import { CourseRepository } from "../repositories/courseRepository";
import { CourseService } from "../services/courseServices";
import { RequestHandler, Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import { uploadCourseFiles } from "../config/multerConfig"; 
import CategoryRepository from "../repositories/categoryRepository";

const courseRepository = new CourseRepository();
const categoryRepository=new CategoryRepository()
const courseService = new CourseService(courseRepository,categoryRepository);
const courseController = new CourseController(courseService);

const instructorRouter = Router();

instructorRouter.post(
    INSTRUCTOR_ROUTES.CREATE_COURSE,
    authenticateUser("Instructor"), 
    uploadCourseFiles,              
    courseController.createCourse.bind(courseController) 
);
instructorRouter.get(INSTRUCTOR_ROUTES.GET_ALL_COURSES,authenticateUser("Instructor"),courseController.getAllCourses.bind(courseController))

export default instructorRouter;