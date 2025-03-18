import { AdminDoc } from "../interfaces/IAdmin";
import { UserDoc } from "../interfaces/IUser";
import { Admin } from "../models/adminModel";
import { Users } from "../models/userModel";
import { BaseRepository } from "./baseRepository";
import { IAdminRepository } from "../interfaces/IRepositories";

export class AdminRepository extends BaseRepository<AdminDoc> implements IAdminRepository {
    private userModel = Users; 

    constructor() {
        super(Admin);
    }
    
    async findByEmail(email: string): Promise<AdminDoc | null> {
        return this._model.findOne({ email });
    }

    async createAdmin(adminData: Partial<AdminDoc>): Promise<AdminDoc> {
        return this.create(adminData);
    }

    async getAllStudents(skip: number, limit: number, search?: string): Promise<UserDoc[]> {
        const query: any = { role: "Student" };
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } }, 
                { name: { $regex: search, $options: 'i' } },  
            ];
        }
        return this.userModel.find(query).skip(skip).limit(limit);
    }

    async countStudents(search?: string): Promise<number> {
        const query: any = { role: "Student" };
        if (search) {
            query.$or = [
                // { email: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
            ];
        }
        return this.userModel.countDocuments(query);
    }

    async findUserById(id: string): Promise<UserDoc | null> {
        return this.userModel.findById(id);
    }

    async toggleBlockStatus(id: string, isBlocked: boolean): Promise<UserDoc | null> {
        return this.userModel.findByIdAndUpdate(id, { isBlocked }, { new: true });
    }

    async getAllRequestedUsers(skip: number, limit: number): Promise<UserDoc[]> {
        return this.userModel.find({ isRequested: true }).skip(skip).limit(limit);
    }

    async countRequestedUsers(): Promise<number> {
        return this.userModel.countDocuments({ isRequested: true });
    }

    async approveInstructorRequest(id: string): Promise<UserDoc | null> {
        return this.userModel.findByIdAndUpdate(
            id,
            { role: "Instructor", isRequested: false, isRejected: false },
            { new: true }
        );
    }

    async rejectInstructorRequest(id: string): Promise<UserDoc | null> {
        return this.userModel.findByIdAndUpdate(
            id,
            { isRequested: false, isRejected: true },
            { new: true }
        );
    }

    async getAllInstructors(skip: number, limit: number, search?: string): Promise<UserDoc[]> {
        const query: any = { role: "Instructor" };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } }, 
            ];
        }
        return this.userModel.find(query).skip(skip).limit(limit);
    }

    async countInstructors(search?: string): Promise<number> {
        const query: any = { role: "Instructor" };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
            ];
        }
        return this.userModel.countDocuments(query);
    } 
}

export default AdminRepository;