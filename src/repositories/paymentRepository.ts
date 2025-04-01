import { PaymentDoc, Payments } from "../models/paymentModel";
import { BaseRepository } from "./baseRepository";
import { IPaymentRepository } from "../interfaces/IRepositories";

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
}

export default PaymentRepository;