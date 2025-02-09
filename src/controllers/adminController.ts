import { Request, Response } from "express";
import { AdminService } from "../services/adminServices";
import { Status } from "../utils/enums";
import { Cookie } from "../interfaces/IEnums";


  
    

class AdminController {
    private _adminService: AdminService;

    constructor(adminService: AdminService) {
        this._adminService = adminService;
    }

      //admin login
      async adminLogin(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(Status.BAD_REQUEST).json({ success: false, message: "Email and password are required." });
                return;
            }

            const response = await this._adminService.adminLogin({ email, password });

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
            const response = await this._adminService.fetchAllStudents(page, limit);
            res.status(Status.OK).json(response);
        } catch (error) {
            console.error("Error in fetchAllStudents Controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
            });
        }
    }


}


export default AdminController