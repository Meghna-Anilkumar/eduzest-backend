import { PaymentDoc, Payments } from "../models/paymentModel";
import { BaseRepository } from "./baseRepository";
import { IPaymentRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";

export class PaymentRepository extends BaseRepository<PaymentDoc> implements IPaymentRepository {
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
    const query: any = { userId: new Types.ObjectId(userId) };

    if (search) {
      query.$or = [
        { "courseId": { $regex: search, $options: "i" } },
        { "userId": { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions: any = sort ? { [sort.field]: sort.order === "asc" ? 1 : -1 } : { createdAt: -1 };

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

  
}

export default PaymentRepository;