import { RequestHandler, Router } from "express";
import { authenticateAdmin } from "../middlewares/authMiddleware";
import AdminController from "../controllers/adminController";
import UserRepository from "../repositories/userRepository";
import { AdminService } from "../services/adminServices";
import { ADMIN_ROUTES } from "../constants/routes_constants";
import AdminRepository from "../repositories/adminRepository";
import CategoryController from "../controllers/categoryController";
import { CategoryService } from "../services/categoryServices";
import CategoryRepository from "../repositories/categoryRepository";
import PaymentService from "../services/paymentServices";
import PaymentRepository from "../repositories/paymentRepository";
import {CourseRepository} from "../repositories/courseRepository";
import {EnrollmentRepository} from "../repositories/enrollmentRepository";
import { redisService } from "../services/redisService";
import { CouponRepository } from "../repositories/couponRepository";
import { CouponService } from "../services/couponServices";
import { CouponController } from "../controllers/couponController";
import { CouponUsageRepository } from "../repositories/couponUsageRepository";
import { OfferRepository } from "../repositories/offerRepository";
import { OfferService } from "../services/offerService";
import { OfferController } from "../controllers/offerController";
import { SubscriptionRepository } from "../repositories/subscriptionRepository";


const userRepository = new UserRepository();
const adminRepository = new AdminRepository()
const categoryRepository = new CategoryRepository();
const paymentRepository = new PaymentRepository()
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository(redisService);
const couponRepository = new CouponRepository();
const couponUsageRepository=new CouponUsageRepository()
const offerRepository = new OfferRepository();
const subscriptionRepository=new SubscriptionRepository()

const adminService = new AdminService(adminRepository,courseRepository,paymentRepository);
const categoryService=new CategoryService(categoryRepository)
const paymentService = new PaymentService(paymentRepository, userRepository, courseRepository, enrollmentRepository,couponRepository,couponUsageRepository,subscriptionRepository);
const couponService = new CouponService(couponRepository,couponUsageRepository);
const offerService = new OfferService(offerRepository,categoryRepository,courseRepository);

const adminController = new AdminController(adminService,paymentService);
const categoryController = new CategoryController(categoryService);
const couponController = new CouponController(couponService);
const offerController = new OfferController(offerService);


const adminRouter = Router();


adminRouter.post(ADMIN_ROUTES.LOGIN,adminController.adminLogin.bind(adminController))
adminRouter.post(ADMIN_ROUTES.LOGOUT,adminController.logout.bind(adminController) as RequestHandler)
adminRouter.get(ADMIN_ROUTES.FETCHALL_STUDENTS, authenticateAdmin(), adminController.fetchAllStudents.bind(adminController) as RequestHandler);
adminRouter.get(ADMIN_ROUTES.FETCHALL_INSTRUCTORS, authenticateAdmin(), adminController.fetchAllInstructors.bind(adminController) as RequestHandler);
adminRouter.put(ADMIN_ROUTES.BLOCK_UNBLOCK_USER, authenticateAdmin(), adminController.blockUnblockUser.bind(adminController));
adminRouter.get(ADMIN_ROUTES.FETCH_REQUESTS,authenticateAdmin(), adminController.fetchAllRequestedUsers.bind(adminController));
adminRouter.patch(ADMIN_ROUTES.APPROVE_INSTRUCTOR,authenticateAdmin(), adminController.approveInstructor.bind(adminController));
adminRouter.patch(ADMIN_ROUTES.REJECT_INSTRUCTOR, authenticateAdmin(), adminController.rejectInstructor.bind(adminController));
adminRouter.get(ADMIN_ROUTES.GET_REQUESTDETAILS,authenticateAdmin(),adminController.fetchRequestDetails.bind(adminController))


// Category management 
adminRouter.post(ADMIN_ROUTES.ADD_CATEGORY,authenticateAdmin(), categoryController.createCategory.bind(categoryController));
adminRouter.get(ADMIN_ROUTES.FETCHALL_CATEGORIES, categoryController.getAllCategories.bind(categoryController));
adminRouter.put(ADMIN_ROUTES.EDIT_CATEGORY, authenticateAdmin(), categoryController.editCategory.bind(categoryController));
adminRouter.put(ADMIN_ROUTES.DELETE_CATEGORY, authenticateAdmin(), categoryController.deleteCategory.bind(categoryController));


//transactions
adminRouter.get(ADMIN_ROUTES.GET_TRANSACTIONS,authenticateAdmin(),adminController.getAdminPayouts.bind(adminController))


//dashboard
adminRouter.get(ADMIN_ROUTES.GET_DASHBOARD_STATS,authenticateAdmin(),adminController.getDashboardStats.bind(adminController))


// Coupon management
adminRouter.post(ADMIN_ROUTES.ADD_COUPON, authenticateAdmin(), couponController.addCoupon.bind(couponController)) 
adminRouter.put(ADMIN_ROUTES.EDIT_COUPON, authenticateAdmin(), couponController.editCoupon.bind(couponController));
adminRouter.delete(ADMIN_ROUTES.DELETE_COUPON, authenticateAdmin(), couponController.deleteCoupon.bind(couponController));
adminRouter.get(ADMIN_ROUTES.FETCHALL_COUPONS, authenticateAdmin(), couponController.getAllCoupons.bind(couponController));


//offer management
adminRouter.post( ADMIN_ROUTES.ADD_OFFER,offerController.addOffer.bind(offerController));
adminRouter.put(ADMIN_ROUTES.EDIT_OFFER,authenticateAdmin(), offerController.editOffer.bind(offerController));
adminRouter.delete(ADMIN_ROUTES.DELETE_OFFER,authenticateAdmin(),offerController.deleteOffer.bind(offerController));
adminRouter.get(ADMIN_ROUTES.FETCHALL_OFFERS,authenticateAdmin(),offerController.getAllOffers.bind(offerController));


export default adminRouter