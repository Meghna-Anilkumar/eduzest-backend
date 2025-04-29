import Stripe from "stripe";
import { IPaymentRepository } from "../interfaces/IRepositories";
import { IResponse } from "../interfaces/IResponse";
import { IPaymentService } from "../interfaces/IServices";
import { IUserRepository } from "../interfaces/IRepositories";
import { ICourseRepository } from "../interfaces/IRepositories";
import { IEnrollmentRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";

export class PaymentService implements IPaymentService {
  private stripe: Stripe;

  constructor(
    private paymentRepository: IPaymentRepository,
    private userRepository: IUserRepository,
    private courseRepository: ICourseRepository,
    private enrollmentRepository: IEnrollmentRepository
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createPaymentIntent(
    userId: string,
    courseId: string,
    amount: number,
    paymentType: "debit" | "credit"
  ): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        console.log("Invalid IDs:", { userId, courseId });
        return { success: false, message: "Invalid userId or courseId" };
      }

      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(courseId);

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        return { success: false, message: "Course not found" };
      }

      if (course.pricing.type === "free") {
        return { success: false, message: "This course is free" };
      }

      if (course.pricing.amount !== amount) {
        return { success: false, message: "Invalid amount" };
      }

      const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
      if (existingEnrollment) {
        return { success: false, message: "User is already enrolled in this course" };
      }

      // Calculate payout amounts
      const instructorPayoutAmount = Math.round(amount * 0.7);
      const adminPayoutAmount = amount - instructorPayoutAmount;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100,
        currency: "inr",
        payment_method_types: ["card"],
        metadata: { userId, courseId },
      });

      const payment = await this.paymentRepository.createPayment({
        userId: userObjectId,
        courseId: courseObjectId,
        paymentType,
        status: "pending",
        amount,
        stripePaymentId: paymentIntent.id,
        instructorPayout: {
          instructorId: course.instructorRef,
          amount: instructorPayoutAmount,
          status: "pending",
        },
        adminPayout: {
          amount: adminPayoutAmount,
          status: "pending",
        },
      });

      return {
        success: true,
        message: "Payment intent created successfully",
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentId: payment._id,
        },
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      return { success: false, message: "Failed to create payment intent" };
    }
  }

  async confirmPayment(paymentId: string): Promise<IResponse> {
    try {
      const payment = await this.paymentRepository.findById(paymentId);
      if (!payment) {
        return { success: false, message: "Payment not found" };
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.stripePaymentId!);
      if (paymentIntent.status === "succeeded") {

        const updatedPayment = await this.paymentRepository.updatePaymentStatus(paymentId, "completed");

        await this.paymentRepository.update(
          { _id: paymentId },
          {
            "instructorPayout.status": "completed",
            "instructorPayout.transactionId": `txn_${paymentId}_instructor`,
            "adminPayout.status": "completed",
            "adminPayout.transactionId": `txn_${paymentId}_admin`,
          }
        );

        await this.userRepository.update(
          { _id: payment.instructorPayout.instructorId },
          { $inc: { "instructorDetails.profit": payment.instructorPayout.amount } }
        );

        const enrollment = await this.enrollmentRepository.createEnrollment({
          userId: payment.userId,
          courseId: payment.courseId,
          enrolledAt: new Date(),
          completionStatus: "enrolled",
        });

        await this.courseRepository.update(
          { _id: payment.courseId },
          { $inc: { studentsEnrolled: 1 } }
        );

        return {
          success: true,
          message: "Payment confirmed successfully",
          data: { payment: updatedPayment, enrollment },
        };
      } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "requires_action") {
        return { success: false, message: "Payment requires additional action" };
      } else {
        await this.paymentRepository.updatePaymentStatus(paymentId, "failed");
        await this.paymentRepository.update(
          { _id: paymentId },
          {
            "instructorPayout.status": "failed",
            "adminPayout.status": "failed",
          }
        );
        return { success: false, message: "Payment failed" };
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      await this.paymentRepository.updatePaymentStatus(paymentId, "failed");
      await this.paymentRepository.update(
        { _id: paymentId },
        {
          "instructorPayout.status": "failed",
          "adminPayout.status": "failed",
        }
      );
      return { success: false, message: "Failed to confirm payment" };
    }
  }

  async getPaymentsByUser(
    userId: string,
    page: number,
    limit: number,
    search?: string,
    sort?: { field: string; order: "asc" | "desc" }
  ): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid userId" };
      }

      const result = await this.paymentRepository.getPaymentsByUser(userId, page, limit, search, sort);
      return {
        success: true,
        message: "Payments retrieved successfully",
        data: result,
      };
    } catch (error) {
      console.error("Error retrieving payments:", error);
      return { success: false, message: "Failed to retrieve payments" };
    }
  }

  async getInstructorPayouts(
    instructorId: string,
    page: number,
    limit: number,
    search?: string,
    sort?: { field: string; order: "asc" | "desc" }
  ): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(instructorId)) {
        return { success: false, message: "Invalid instructorId" };
      }

      const result = await this.paymentRepository.getInstructorPayouts(instructorId, page, limit, search, sort);

      return {
        success: true,
        message: "Instructor payouts retrieved successfully",
        data: result,
      };
    } catch (error) {
      console.error("Error retrieving instructor payouts:", error);
      return { success: false, message: "Failed to retrieve instructor payouts" };
    }
  }

  async getAdminPayouts(
    page: number,
    limit: number,
    search?: string,
    sort?: { field: string; order: "asc" | "desc" }
  ): Promise<IResponse> {
    try {
      const result = await this.paymentRepository.getAdminPayouts(page, limit, search, sort);

      return {
        success: true,
        message: "Admin payouts retrieved successfully",
        data: result,
      };
    } catch (error) {
      console.error("Error retrieving admin payouts:", error);
      return { success: false, message: "Failed to retrieve admin payouts" };
    }
  }
}

export default PaymentService;