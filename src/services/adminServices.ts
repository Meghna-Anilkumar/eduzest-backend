import AdminRepository from '../repositories/adminRepository';
import { IResponse } from '../interfaces/IResponse';
import { IAdminService } from '../interfaces/IServices';
import UserRepository from '../repositories/userRepository';
import { comparePassword, hashPassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { AdminDoc } from '../interfaces/IAdmin';
// import { Cookie } from '../interfaces/IEnums';
// import { Response } from "express";


export class AdminService implements IAdminService {
    constructor(
        private _userRepository: UserRepository,
        private _adminRepository: AdminRepository
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

            let existingAdmin = await this._adminRepository.findByQuery({ email });

            if (!existingAdmin) {
                const hashedPassword = await hashPassword(adminPassword);
                existingAdmin = await this._adminRepository.create({ email: adminEmail, password: hashedPassword });
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

            const students = await this._userRepository.findAll(
                { role: "Student" },
                skip,
                {},
                limit
            );

            console.log("Students found:", students);

            const totalStudents = await this._userRepository.count({ role: "Student" });

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
            const existingUser = await this._userRepository.findById(_id);

            if (!existingUser) {
                return {
                    success: false,
                    message: "User not found.",
                };
            }

            existingUser.isBlocked = !existingUser.isBlocked;
            await existingUser.save();

            return {
                success: true,
                message: `User has been ${existingUser.isBlocked ? "blocked" : "unblocked"} successfully.`,
                userData: existingUser,
            };
        } catch (error) {
            console.error("Error blocking/unblocking user:", error);
            return {
                success: false,
                message: "Failed to update user status. Please try again.",
            };
        }
    }



}