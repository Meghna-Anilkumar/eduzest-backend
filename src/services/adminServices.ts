import AdminRepository from '../repositories/adminRepository';
import { IResponse } from '../interfaces/IResponse';
import { IAdminService } from '../interfaces/IServices';
import UserRepository from '../repositories/userRepository';
import { comparePassword, hashPassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { AdminDoc } from '../interfaces/IAdmin';

export class AdminService implements IAdminService {
    constructor(
        private _userRepository: UserRepository,
        private _adminRepository: AdminRepository,
    ) { }

    //admin login
    async adminLogin({ email, password }: { email: string; password: string }): Promise<IResponse> {
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
                    password: hashedPassword 
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

    //list users on admin side
    async fetchAllStudents(page: number, limit: number): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;
            
            const students = await this._userRepository.getAllStudents(skip, limit);
            const totalStudents = await this._userRepository.countStudents();

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

    // block or unblock user
    async blockUnblockUser(_id: string): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findUserById(_id);

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            const updatedIsBlocked = !existingUser.isBlocked;
            
            const updatedUser = await this._userRepository.toggleBlockStatus(_id, updatedIsBlocked);

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

    //get all requests
    async fetchAllRequestedUsers(page: number, limit: number): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;
            
            const requestedUsers = await this._userRepository.getAllRequestedUsers(skip, limit);
            const totalRequestedUsers = await this._userRepository.countRequestedUsers();

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
            const existingUser = await this._userRepository.findUserById(_id);

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
            
            const updatedUser = await this._userRepository.approveInstructorRequest(_id);

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

    //reject instructor
    async rejectInstructor(_id: string): Promise<IResponse> {
        try {
            const existingUser = await this._userRepository.findUserById(_id);

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
            
            const updatedUser = await this._userRepository.rejectInstructorRequest(_id);

            if (!updatedUser) {
                return {
                    success: false,
                    message: "Failed to reject instructor request.",
                };
            }

            return {
                success: true,
                message: "User's instructor request has been rejected.",
                userData: updatedUser,
            };
        } catch (error) {
            console.error("Error rejecting instructor:", error);
            return {
                success: false,
                message: "Failed to reject instructor request. Please try again.",
            };
        }
    }

    //fetch all instructors
    async fetchAllInstructors(page: number, limit: number): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;
            
            const instructors = await this._userRepository.getAllInstructors(skip, limit);
            const totalInstructors = await this._userRepository.countInstructors();

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
            const requestDetails = await this._userRepository.findUserById(_id);

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
}

export default AdminService;