import { Request, Response, NextFunction } from "express";
import { Status } from "../utils/enums";
import { Cookie } from "../utils/Enum";
import { IAdminService } from "../interfaces/IServices";
import { IPaymentService } from "../interfaces/IServices";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";


class AdminController {
    constructor(private _adminService: IAdminService,
        private _paymentService: IPaymentService
    ) { }


    //admin login
    async adminLogin(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "Email and password are required" });
                return;
            }

            const response = await this._adminService.adminLogin({ email, password }, res);

            if (!response.success) {
                res.status(Status.UN_AUTHORISED).json(response);
                return;
            }

            res.cookie(Cookie.adminJWT, response.token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
            });

            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in adminLogin controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR });
        }
    }


    //get all users
    async fetchAllStudents(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string | undefined;

            const response = await this._adminService.fetchAllStudents(page, limit, search);
            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in fetchAllStudents Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }


    // Block or unblock user
    async blockUnblockUser(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: MESSAGE_CONSTANTS.USER_ID_REQUIRED });
                return;
            }

            const response = await this._adminService.blockUnblockUser(id);

            if (!response.success) {
                res.status(Status.NOT_FOUND).json(response);
                return;
            }

            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in blockUnblockUser Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
            });
        }
    }


    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            res.clearCookie(Cookie.adminJWT, {
                httpOnly: true,
            });

            return res.status(Status.OK).json({
                status: "Success",
                message: MESSAGE_CONSTANTS.LOGOUT_SUCCESS
            });
        } catch (error) {
            next(error);
        }
    }


    async fetchAllRequestedUsers(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const response = await this._adminService.fetchAllRequestedUsers(page, limit);

            res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
            console.error("Error in fetchAllRequestedUsers Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }

    // Approve Instructor
    async approveInstructor(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "User ID is required." });
                return;
            }

            const response = await this._adminService.approveInstructor(id);

            if (!response.success) {
                res.status(Status.NOT_FOUND).json(response);
                return;
            }

            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in approveInstructor Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }


    // Reject Instructor
    async rejectInstructor(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { message } = req.body;

            if (!id) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "User ID is required." });
                return;
            }

            if (!message?.trim()) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "Rejection message is required." });
                return;
            }

            const response = await this._adminService.rejectInstructor(id, message);

            if (!response.success) {
                res.status(Status.NOT_FOUND).json(response);
                return;
            }

            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in rejectInstructor Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }




    // Fetch all instructors
    async fetchAllInstructors(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string | undefined;

            const response = await this._adminService.fetchAllInstructors(page, limit, search);

            res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
            console.error("Error in fetchAllInstructors Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }


    // Fetch request details by ID
    async fetchRequestDetails(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "Request ID is required." });
                return;
            }

            const response = await this._adminService.fetchRequestDetails(id);

            if (!response.success) {
                res.status(Status.NOT_FOUND).json(response);
                return;
            }

            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in fetchRequestDetails Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }


    async getAdminPayouts(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string | undefined;
            const sortField = req.query.sortField as string | undefined;
            const sortOrder = req.query.sortOrder as string | undefined;
            const courseFilter = req.query.courseFilter as string | undefined;

            const sort = sortField
                ? { field: sortField, order: (sortOrder as "asc" | "desc") || "desc" }
                : undefined;

            const result = await this._paymentService.getAdminPayouts(
                page,
                limit,
                search,
                sort,
                courseFilter
            );

            res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
            res.status(Status.OK).json(result);
        } catch (error) {
            console.error("Error fetching admin payouts:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR,
            });
        }
    }

    async getDashboardStats(req: Request, res: Response): Promise<void> {
        try {
            const { period = "day" } = req.query;
            const validPeriods = ["day", "month", "year"];
            if (!validPeriods.includes(period as string)) {
                res.status(400).json({ success: false, message: "Invalid period parameter" });
                return;
            }
            const response = await this._adminService.getDashboardStats(period as "day" | "month" | "year");
            res.status(response.success ? 200 : 400).json(response);
        } catch (error) {
            console.error("Error in getDashboardStats:", error);
            res.status(500).json({ success: false, message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR });
        }
    }





}


export default AdminController