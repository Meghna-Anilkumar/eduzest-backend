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

// Add uploadCourseFiles middleware in the route chain
instructorRouter.post(
    INSTRUCTOR_ROUTES.CREATE_COURSE,
    authenticateUser("Instructor"), // Authentication middleware first
    uploadCourseFiles,              // Multer middleware to handle file uploads
    courseController.createCourse.bind(courseController) // Controller handler
);

export default instructorRouter;