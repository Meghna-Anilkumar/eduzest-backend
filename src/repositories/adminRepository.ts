import { AdminDoc } from "../interfaces/IAdmin";
import { UserDoc } from "../interfaces/IUser";
import { EnrollmentDoc,Enrollments } from "../models/enrollmentModel";
import { Admin } from "../models/adminModel";
import { Users } from "../models/userModel";
import { BaseRepository } from "./baseRepository";
import { IAdminRepository } from "../interfaces/IRepositories";
import { Role } from '../utils/Enum';

export class AdminRepository extends BaseRepository<AdminDoc> implements IAdminRepository {
    private userModel = Users; 
    private enrollmentModel=Enrollments;

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
        const query: any = { role: Role.student };
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } }, 
                { name: { $regex: search, $options: 'i' } },  
            ];
        }
        return this.userModel.find(query).skip(skip).limit(limit);
    }

    async countStudents(search?: string): Promise<number> {
        const query: any = { role: Role.student };
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
        return this.userModel.find({ isRequested: true, isApproved: false }).skip(skip).limit(limit);
    }

    async countRequestedUsers(): Promise<number> {
        return this.userModel.countDocuments({ isRequested: true ,isApproved: false });
    }

    async approveInstructorRequest(id: string): Promise<UserDoc | null> {
        return this.userModel.findByIdAndUpdate(
            id,
            {isApproved:true, isRejected: false },
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
        const query: any = { role: Role.instructor };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } }, 
            ];
        }
        return this.userModel.find(query).skip(skip).limit(limit);
    }

    async countInstructors(search?: string): Promise<number> {
        const query: any = { role: Role.instructor};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
            ];
        }
        return this.userModel.countDocuments(query);
    } 


async getStudentGrowth(
  startDate: Date,
  endDate: Date,
  period: "day" | "month" | "year"
): Promise<{ date: string; count: number }[]> {
  const dateFormat = period === "day" ? "%Y-%m-%d" : period === "month" ? "%Y-%m" : "%Y";

  // Cap the endDate at the current date
  const today = new Date();
  const effectiveEndDate = endDate > today ? today : endDate;

  // Aggregate enrollments for students
  const result = await this.enrollmentModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.role": "Student",
        enrolledAt: { $gte: startDate, $lte: effectiveEndDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$enrolledAt" } },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        date: "$_id",
        count: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // Generate periods up to the effective end date
  const periods: { date: string; count: number }[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= effectiveEndDate) {
    const dateStr =
      period === "day"
        ? currentDate.toISOString().split("T")[0] // e.g., "2024-04-23"
        : period === "month"
        ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}` // e.g., "2024-04"
        : currentDate.getFullYear().toString(); // e.g., "2024"

    const found = result.find((item: { date: string; count: number }) => item.date === dateStr);
    periods.push({
      date: dateStr,
      count: found ? found.count : 0,
    });

    if (period === "day") {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (period === "month") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    }
  }

  return periods;
}
}

export default AdminRepository;