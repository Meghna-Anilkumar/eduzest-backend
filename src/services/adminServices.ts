import { IAdminRepository,ICourseRepository,IPaymentRepository } from '../interfaces/IRepositories';
import { IResponse } from '../interfaces/IResponse';
import { IAdminService } from '../interfaces/IServices';
import { comparePassword, hashPassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { AdminDoc } from '../interfaces/IAdmin';
import { Response } from 'express';
import { sendEmail } from '../utils/nodemailer';


export class AdminService implements IAdminService {
    constructor(
        private _adminRepository: IAdminRepository,
        private _courseRepository: ICourseRepository,
        private _paymentRepository: IPaymentRepository
    ) {}

    // Admin login
    async adminLogin({ email, password }: { email: string; password: string }, res: Response): Promise<IResponse> {
        try {
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminPassword = process.env.ADMIN_PASS;

            if (!adminEmail || !adminPassword) {
                return {
                    success: false,
                    message: "Admin credentials are not set.",
                };
            }

            let existingAdmin = await this._adminRepository.findByEmail(email);

            if (!existingAdmin) {
                const hashedPassword = await hashPassword(adminPassword);
                existingAdmin = await this._adminRepository.createAdmin({ 
                    email: adminEmail, 
                    password: hashedPassword,
                    role: "Admin" 
                });
                console.log("Default admin account created.");
            }

            if (email !== adminEmail) {
                return {
                    success: false,
                    message: "Invalid admin credentials.",
                };
            }

            const isPasswordValid = await comparePassword(password, existingAdmin.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: "Invalid email or password.",
                };
            }

            const token = generateToken(existingAdmin);

            res.cookie("adminJWT", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 24 * 60 * 60 * 1000, 
            });

            return {
                success: true,
                message: "Admin logged in successfully.",
                token: token,
                userData: {
                    _id: existingAdmin._id,
                    email: existingAdmin.email,
                    role: "Admin"
                } as AdminDoc
            };
        } catch (error) {
            console.error("Error during admin login:", error);
            return {
                success: false,
                message: "Something went wrong. Please try again later.",
            };
        }
    }

    // List users on admin side
    async fetchAllStudents(page: number, limit: number, search?: string): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;
            
            const students = await this._adminRepository.getAllStudents(skip, limit, search);
            const totalStudents = await this._adminRepository.countStudents(search);

            return {
                success: true,
                message: "Students fetched successfully",
                data: {
                    students,
                    totalStudents,
                    totalPages: Math.ceil(totalStudents / limit),
                    currentPage: page,
                },
            };
        } catch (error) {
            console.error("Error fetching students:", error);
            return {
                success: false,
                message: "Failed to fetch students. Please try again.",
            };
        }
    }

    // Block or unblock user
    async blockUnblockUser(_id: string): Promise<IResponse> {
        try {
            const existingUser = await this._adminRepository.findUserById(_id);

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            const updatedIsBlocked = !existingUser.isBlocked;
            
            const updatedUser = await this._adminRepository.toggleBlockStatus(_id, updatedIsBlocked);

            if (!updatedUser) {
                return {
                    success: false,
                    message: "Failed to update user status.",
                };
            }

            return {
                success: true,
                message: `User has been ${updatedUser.isBlocked ? "blocked" : "unblocked"} successfully.`,
                userData: updatedUser,
            };
        } catch (error) {
            console.error("Error blocking/unblocking user:", error);
            return {
                success: false,
                message: "Failed to update user status. Please try again.",
            };
        }
    }

    // Get all instructor requests
    async fetchAllRequestedUsers(page: number, limit: number): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;
            
            const requestedUsers = await this._adminRepository.getAllRequestedUsers(skip, limit);
            const totalRequestedUsers = await this._adminRepository.countRequestedUsers();

            return {
                success: true,
                message: "Requested users fetched successfully",
                data: {
                    requestedUsers,
                    totalRequestedUsers,
                    totalPages: Math.ceil(totalRequestedUsers / limit),
                    currentPage: page,
                },
            };
        } catch (error) {
            console.error("Error fetching requested users:", error);
            return {
                success: false,
                message: "Failed to fetch requested users. Please try again.",
            };
        }
    }
    
    // Approve instructor request
    async approveInstructor(_id: string): Promise<IResponse> {
        try {
            const existingUser = await this._adminRepository.findUserById(_id);

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            if (!existingUser.isRequested) {
                return {
                    success: false,
                    message: "This user has not requested instructor approval.",
                };
            }
            
            const updatedUser = await this._adminRepository.approveInstructorRequest(_id);

            if (!updatedUser) {
                return {
                    success: false,
                    message: "Failed to approve instructor.",
                };
            }

            return {
                success: true,
                message: "User has been approved as an Instructor successfully.",
                userData: updatedUser,
            };
        } catch (error) {
            console.error("Error approving instructor:", error);
            return {
                success: false,
                message: "Failed to approve instructor. Please try again.",
            };
        }
    }


    // Reject instructor request
    async rejectInstructor(_id: string, rejectionMessage: string): Promise<IResponse> {
        try {
            const existingUser = await this._adminRepository.findUserById(_id);
    
            if (!existingUser) {
                return { success: false, message: "User not found." };
            }
    
            if (!existingUser.isRequested) {
                return { success: false, message: "This user has not requested instructor approval." };
            }
    
            const updatedUser = await this._adminRepository.rejectInstructorRequest(_id);
    
            if (!updatedUser) {
                return { success: false, message: "Failed to reject instructor request." };
            }
    
            await sendEmail(
                existingUser.email,
                "Instructor Request Rejected",
                rejectionMessage,
                `<p>Dear ${existingUser.name},</p><p>Your instructor request has been rejected. Reason: ${rejectionMessage}</p><p>Best regards,<br/>Admin Team</p>`
            );
    
            return {
                success: true,
                message: "User's instructor request has been rejected, and an email has been sent.",
                userData: updatedUser,
            };
        } catch (error) {
            console.error("Error rejecting instructor:", error);
            return { success: false, message: "Failed to reject instructor request. Please try again." };
        }
    }
    
    // Fetch all instructors
    async fetchAllInstructors(page: number, limit: number, search?: string): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;
            
            const instructors = await this._adminRepository.getAllInstructors(skip, limit, search);
            const totalInstructors = await this._adminRepository.countInstructors(search);

            return {
                success: true,
                message: "Instructors fetched successfully",
                data: {
                    instructors,
                    totalInstructors,
                    totalPages: Math.ceil(totalInstructors / limit),
                    currentPage: page,
                },
            };
        } catch (error) {
            console.error("Error fetching instructors:", error);
            return {
                success: false,
                message: "Failed to fetch instructors. Please try again.",
            };
        }
    }

    // Fetch request details by ID
    async fetchRequestDetails(_id: string): Promise<IResponse> {
        try {
            const requestDetails = await this._adminRepository.findUserById(_id);

            if (!requestDetails) {
                return {
                    success: false,
                    message: "Request not found.",
                };
            }

            return {
                success: true,
                message: "Request details fetched successfully.",
                data: requestDetails,
            };
        } catch (error) {
            console.error("Error fetching request details:", error);
            return {
                success: false,
                message: "Failed to fetch request details. Please try again.",
            };
        }
    }

    async getDashboardStats(period: "day" | "month" | "year" = "day"): Promise<IResponse> {
        try {
          // Calculate the date range based on the period
          const endDate = new Date();
          const startDate = new Date();
          let rangeLength: number;
      
          if (period === "day") {
            rangeLength = 30; // Last 30 days
            startDate.setDate(endDate.getDate() - rangeLength);
          } else if (period === "month") {
            rangeLength = 12; // Last 12 months
            startDate.setMonth(endDate.getMonth() - rangeLength);
          } else {
            rangeLength = 5; // Last 5 years
            startDate.setFullYear(endDate.getFullYear() - rangeLength);
          }
      
          // Fetch total counts and payments
          const [totalStudents, totalInstructors, activeCourses, payments, studentGrowthData, revenueData] =
            await Promise.all([
              this._adminRepository.countStudents(),
              this._adminRepository.countInstructors(),
              this._courseRepository.countDocuments({ isPublished: true }),
              this._paymentRepository.findAll({ status: "completed" }, 0, { createdAt: -1 }),
              this._adminRepository.getStudentGrowth(startDate, endDate, period),
              this._paymentRepository.getRevenueOverview(startDate, endDate, period),
            ]);
      
          const totalRevenue = payments.reduce((sum, payment) => sum + payment.adminPayout.amount, 0);
      
          // Format student growth and revenue data with user-friendly labels
          const studentGrowth = studentGrowthData.map((item) => ({
            date:
              period === "day"
                ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) // e.g., "Apr 23"
                : period === "month"
                ? new Date(item.date).toLocaleString("en-US", { month: "short", year: "numeric" }) // e.g., "Apr 2024"
                : item.date, // e.g., "2024"
            count: item.count,
          }));
      
          const revenueOverview = revenueData.map((item) => ({
            date:
              period === "day"
                ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) // e.g., "Apr 23"
                : period === "month"
                ? new Date(item.date).toLocaleString("en-US", { month: "short", year: "numeric" }) // e.g., "Apr 2024"
                : item.date, // e.g., "2024"
            amount: item.amount,
          }));
      
          return {
            success: true,
            message: "Dashboard statistics fetched successfully",
            data: {
              totalStudents,
              totalInstructors,
              activeCourses,
              totalRevenue,
              studentGrowth,
              revenueOverview,
            },
          };
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
          return {
            success: false,
            message: "Failed to fetch dashboard statistics",
          };
        }
      }
}

export default AdminService;