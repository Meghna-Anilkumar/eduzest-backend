import { Request, Response, NextFunction } from "express";
import { Status } from "../utils/enums";
import { Cookie } from "../interfaces/IEnums";
import { IAdminService } from "../interfaces/IServices";



class AdminController {
    constructor( private _adminService: IAdminService) { }


    //admin login
    async adminLogin(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "Email and password are required." });
                return;
            }

            const response = await this._adminService.adminLogin({ email, password },res);

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
            res.status(Status.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error." });
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
                message: "Internal server error",
            });
        }
    }


    // Block or unblock user
    async blockUnblockUser(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "User ID is required." });
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
                message: "Internal server error",
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
                message: "User logged out successfully",
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
                message: "Internal server error",
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
                message: "Internal server error",
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
                message: "Internal server error",
            });
        }
    }
    



    // Fetch all instructors
    async fetchAllInstructors(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string | undefined; 

            const response = await this._adminService.fetchAllInstructors(page, limit,search);

            res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
            console.error("Error in fetchAllInstructors Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
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
                message: "Internal server error",
            });
        }
    }




}


export default AdminController