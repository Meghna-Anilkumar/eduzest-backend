import Stripe from "stripe";
import { PaymentRepository } from "../repositories/paymentRepository";
import { IResponse } from "../interfaces/IResponse";
import { IPaymentService } from "../interfaces/IServices";
import { UserRepository } from "../repositories/userRepository";
import { CourseRepository } from "../repositories/courseRepository";
import { EnrollmentRepository } from "../repositories/enrollmentRepository";
import { Types } from "mongoose";

export class PaymentService implements IPaymentService {
  private stripe: Stripe;

  constructor(
    private paymentRepository: PaymentRepository,
    private userRepository: UserRepository,
    private courseRepository: CourseRepository,
    private enrollmentRepository: EnrollmentRepository
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
        return { success: false, message: "Payment failed" };
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      await this.paymentRepository.updatePaymentStatus(paymentId, "failed");
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
}

export default PaymentService;