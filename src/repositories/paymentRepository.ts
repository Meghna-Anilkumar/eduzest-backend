import { PaymentDoc, Payments } from "../models/paymentModel";
import { BaseRepository } from "./baseRepository";
import { IPaymentRepository } from "../interfaces/IRepositories";
import { Types, FilterQuery, SortOrder } from "mongoose";
import { Course } from "../models/courseModel";

interface PopulatedUser {
  name: string;
}

interface PopulatedCourse {
  title: string;
}

interface PopulatedPayment extends Omit<PaymentDoc, 'userId' | 'courseId'> {
  userId: PopulatedUser;
  courseId: PopulatedCourse;
}

interface PayoutData {
  transactionId: string;
  date: string;
  course: string;
  studentName: string;
  amount: string;
}

interface RevenueAggregationResult {
  date: string;
  amount: number;
}

export class PaymentRepository extends BaseRepository<PaymentDoc> implements IPaymentRepository {
  private _courseModel = Course;

  constructor() {
    super(Payments);
  }

  async findByUserId(userId: string): Promise<PaymentDoc[]> {
    return this.findAll({ userId }, 0, { createdAt: -1 });
  }

  async findByCourseId(courseId: string): Promise<PaymentDoc[]> {
    return this.findAll({ courseId }, 0, { createdAt: -1 });
  }

  async updatePaymentStatus(paymentId: string, status: PaymentDoc["status"]): Promise<PaymentDoc | null> {
    return this.update({ _id: paymentId }, { status }, { new: true });
  }

  async createPayment(paymentData: Partial<PaymentDoc>): Promise<PaymentDoc> {
    return this.create(paymentData);
  }

  async getPaymentsByUser(
    userId: string,
    page: number,
    limit: number,
    search?: string,
    sort?: { field: string; order: "asc" | "desc" }
  ): Promise<{ data: PaymentDoc[]; total: number; page: number; limit: number }> {
    const query: FilterQuery<PaymentDoc> = { userId: new Types.ObjectId(userId) };

    if (search) {
      query.$or = [
        { courseId: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions: Record<string, SortOrder> = sort 
      ? { [sort.field]: sort.order === "asc" ? 1 : -1 } 
      : { createdAt: -1 };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this._model
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this._model.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async getInstructorPayouts(
    instructorId: string,
    page: number,
    limit: number,
    search?: string,
    sort?: { field: string; order: "asc" | "desc" },
    courseFilter?: string
  ): Promise<{ data: PayoutData[]; total: number; page: number; limit: number }> {
    const query: FilterQuery<PaymentDoc> = { 
      "instructorPayout.instructorId": new Types.ObjectId(instructorId) 
    };

    if (search) {
      query.$or = [
        { courseId: { $regex: search, $options: "i" } },
        { "instructorPayout.transactionId": { $regex: search, $options: "i" } },
      ];
    }

    if (courseFilter) {
      const courses = await this._courseModel
        .find({ title: { $regex: courseFilter, $options: "i" } }, { _id: 1 })
        .lean();
      const courseIds = courses.map((course) => course._id);
      if (courseIds.length > 0) {
        query.courseId = { $in: courseIds };
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    const sortOptions: Record<string, SortOrder> = sort && sort.field === "date"
      ? { createdAt: sort.order === "asc" ? 1 : -1 }
      : { createdAt: -1 };

    console.log("Sort options:", sortOptions);

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this._model
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate<{ userId: PopulatedUser }>("userId", "name")
        .populate<{ courseId: PopulatedCourse }>("courseId", "title")
        .lean(),
      this._model.countDocuments(query),
    ]);

    const data: PayoutData[] = (payments as unknown as PopulatedPayment[]).map((payment) => ({
      transactionId: payment.instructorPayout.transactionId || "N/A",
      date: payment.createdAt ? new Date(payment.createdAt).toISOString() : "N/A",
      course: payment.courseId?.title || "Unknown",
      studentName: payment.userId?.name || "Unknown",
      amount: payment.instructorPayout.amount != null
        ? payment.instructorPayout.amount.toFixed(2) 
        : "0.00",
    }));

    console.log("Sorted payments:", data.map((p) => ({ date: p.date })));

    return { data, total, page, limit };
  }

  async getAdminPayouts(
    page: number,
    limit: number,
    search?: string,
    sort?: { field: string; order: "asc" | "desc" },
    courseFilter?: string
  ): Promise<{ data: PayoutData[]; total: number; page: number; limit: number }> {
    const query: FilterQuery<PaymentDoc> = {};

    if (search) {
      query.$or = [
        { courseId: { $regex: search, $options: "i" } },
        { "adminPayout.transactionId": { $regex: search, $options: "i" } },
      ];
    }

    if (courseFilter && courseFilter.trim()) {
      const decodedCourseFilter = decodeURIComponent(courseFilter).trim();
      console.log("Original courseFilter:", courseFilter);
      console.log("Decoded courseFilter:", decodedCourseFilter);
      
      const courses = await this._courseModel
        .find({ 
          title: { $regex: decodedCourseFilter, $options: "i" } 
        }, { _id: 1 })
        .lean();
      
      console.log("Found courses for filter:", courses);
      
      const courseIds = courses.map((course) => course._id);
      if (courseIds.length > 0) {
        query.courseId = { $in: courseIds };
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    const sortOptions: Record<string, SortOrder> = sort && sort.field === "date"
      ? { createdAt: sort.order === "asc" ? 1 : -1 }
      : { createdAt: -1 };

    console.log("Final query:", JSON.stringify(query));
    console.log("Sort options:", sortOptions);

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this._model
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate<{ userId: PopulatedUser }>("userId", "name")
        .populate<{ courseId: PopulatedCourse }>("courseId", "title")
        .lean(),
      this._model.countDocuments(query),
    ]);

    const data: PayoutData[] = (payments as unknown as PopulatedPayment[]).map((payment) => ({
      transactionId: payment.adminPayout.transactionId || "N/A",
      date: payment.createdAt ? new Date(payment.createdAt).toISOString() : "N/A",
      course: payment.courseId?.title || "Unknown",
      studentName: payment.userId?.name || "Unknown",
      amount: payment.adminPayout.amount != null
        ? payment.adminPayout.amount.toFixed(2)
        : "0.00",
    }));

    console.log("Found payments:", data.length);
    return { data, total, page, limit };
  }

  async getRevenueOverview(
    startDate: Date,
    endDate: Date,
    period: "day" | "month" | "year"
  ): Promise<{ date: string; amount: number }[]> {
    const dateFormat = period === "day" ? "%Y-%m-%d" : period === "month" ? "%Y-%m" : "%Y";

    const today = new Date();
    const effectiveEndDate = endDate > today ? today : endDate;

    const result = await this._model.aggregate<RevenueAggregationResult>([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: startDate, $lte: effectiveEndDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          amount: { $sum: "$adminPayout.amount" },
        },
      },
      {
        $project: {
          date: "$_id",
          amount: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const periods: { date: string; amount: number }[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= effectiveEndDate) {
      const dateStr =
        period === "day"
          ? currentDate.toISOString().split("T")[0]
          : period === "month"
            ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`
            : currentDate.getFullYear().toString();

      const found = result.find((item) => item.date === dateStr);
      periods.push({
        date: dateStr,
        amount: found ? found.amount : 0,
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

export default PaymentRepository;