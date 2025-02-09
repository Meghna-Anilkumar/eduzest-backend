import { RequestHandler, Router } from "express";
import AdminController from "../controllers/adminController";
import UserRepository from "../repositories/userRepository";
import {AdminService} from "../services/adminServices";
import { ADMIN_ROUTES } from "../constants/routes_constants";
import AdminRepository from "../repositories/adminRepository";


const userRepository = new UserRepository();
const adminRepository=new AdminRepository()

const adminService = new AdminService(userRepository,adminRepository);
const adminController = new AdminController(adminService);


const adminRouter = Router();

adminRouter.get(ADMIN_ROUTES.FETCHALL_STUDENTS,adminController.fetchAllStudents.bind(adminController) as RequestHandler)
adminRouter.post(ADMIN_ROUTES.LOGIN,adminController.adminLogin.bind(adminController) as RequestHandler)

export default adminRouter