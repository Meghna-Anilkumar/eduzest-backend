import Stripe from "stripe";
import { IPaymentRepository } from "../interfaces/IRepositories";
import { IResponse } from "../interfaces/IResponse";
import { IPaymentService } from "../interfaces/IServices";
import { IUserRepository } from "../interfaces/IRepositories";
import { ICourseRepository } from "../interfaces/IRepositories";
import { IEnrollmentRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";
import { ICouponRepository } from "../interfaces/IRepositories";
import { ICouponUsageRepository } from "../interfaces/IRepositories";
import { ISubscriptionRepository } from "../interfaces/IRepositories";

export class PaymentService implements IPaymentService {
  private stripe: Stripe;

  constructor(
    private paymentRepository: IPaymentRepository,
    private userRepository: IUserRepository,
    private courseRepository: ICourseRepository,
    private enrollmentRepository: IEnrollmentRepository,
    private _couponRepository: ICouponRepository,
    private _couponUsageRepository: ICouponUsageRepository,
    private _subscriptionRepository: ISubscriptionRepository
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createPaymentIntent(
    userId: string,
    courseId: string,
    amount: number,
    paymentType: "debit" | "credit",
    couponId?: string
  ): Promise<IResponse> {
    try {
      console.log("Received in createPaymentIntent:", { userId, courseId, amount, paymentType, couponId });

      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        console.log("Invalid IDs:", { userId, courseId });
        return { success: false, message: "Invalid userId or courseId" };
      }

      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(courseId);

      const user = await this.userRepository.findById(userId);
      if (!user) {
        console.log("User not found:", { userId });
        return { success: false, message: "User not found" };
      }

      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        console.log("Course not found:", { courseId });
        return { success: false, message: "Course not found" };
      }

      if (course.pricing.type === "free") {
        console.log("Attempted payment for free course:", { courseId });
        return { success: false, message: "This course is free" };
      }

      const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
      if (existingEnrollment) {
        console.log("User already enrolled:", { userId, courseId });
        return { success: false, message: "User is already enrolled in this course" };
      }

      let expectedPrice = course.pricing.amount;
      console.log("Original course price:", expectedPrice);

      console.log("Course data retrieved:", {
        courseId: course._id,
        pricing: course.pricing,
        offer: course.offer,
      });


      if (
        course.offer &&
        typeof course.offer === "object" &&
        course.offer.offerPrice !== undefined &&
        course.offer.offerPrice !== null &&
        (!course.offer.expirationDate || new Date(course.offer.expirationDate) >= new Date())
      ) {
        expectedPrice = course.offer.offerPrice;
        console.log("Price after applying offer:", expectedPrice, { offer: course.offer });
      } else {
        console.log("Offer not applied. Conditions not met:", {
          hasOffer: !!course.offer,
          offerIsObject: typeof course.offer === "object",
          offerPriceDefined: course.offer?.offerPrice !== undefined,
          offerPriceNull: course.offer?.offerPrice === null,
          expirationDateValid: !course.offer?.expirationDate || new Date(course.offer.expirationDate) >= new Date(),
        });
      }

      if (expectedPrice === undefined || expectedPrice === null || isNaN(expectedPrice)) {
        console.error("Invalid expectedPrice after offer calculation:", expectedPrice);
        return { success: false, message: "Invalid course pricing" };
      }

      let coupon;
      if (couponId) {
        if (!Types.ObjectId.isValid(couponId)) {
          console.log("Invalid couponId:", { couponId });
          return { success: false, message: "Invalid couponId" };
        }

        coupon = await this._couponRepository.findById(couponId);
        if (!coupon) {
          console.log("Coupon not found:", { couponId });
          return { success: false, message: "Coupon not found" };
        }

        if (new Date(coupon.expirationDate) < new Date()) {
          console.log("Coupon expired:", { couponId, expirationDate: coupon.expirationDate });
          return {
            success: false,
            message: `Coupon expired on ${new Date(coupon.expirationDate).toLocaleDateString()}`,
          };
        }


        const hasUsedCoupon = await this._couponUsageRepository.hasUserUsedCoupon(userId, couponId);
        if (hasUsedCoupon) {
          console.log("Coupon already used:", { userId, couponId });
          return { success: false, message: "This coupon has already been used by the user" };
        }

        if (coupon.minPurchaseAmount && course.pricing.amount < coupon.minPurchaseAmount) {
          console.log("Minimum purchase amount not met:", {
            originalPrice: course.pricing.amount,
            minPurchaseAmount: coupon.minPurchaseAmount,
          });
          return {
            success: false,
            message: `This coupon requires a minimum purchase of ₹${coupon.minPurchaseAmount}.`,
          };
        }

        let discountAmount = (expectedPrice * coupon.discountPercentage) / 100;
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
          console.log("Discount capped at maxDiscountAmount:", { discountAmount, maxDiscountAmount: coupon.maxDiscountAmount });
        }

        expectedPrice = Math.round(Math.max(0, expectedPrice - discountAmount));
        console.log("Price after coupon:", expectedPrice, {
          discountAmount,
          coupon: { code: coupon.code, discountPercentage: coupon.discountPercentage },
        });
      }

      if (amount !== expectedPrice) {
        console.log("Amount mismatch:", { passedAmount: amount, expectedPrice });
        return {
          success: false,
          message: `Invalid amount. Expected ₹${expectedPrice}, but received ₹${amount}.`,
        };
      }

      const finalAmount = expectedPrice;
      if (finalAmount <= 0) {
        console.log("Invalid final amount:", { finalAmount });
        return { success: false, message: "Final amount must be greater than zero" };
      }

      const amountInPaise = finalAmount * 100;
      const minAmountPaise = parseInt(process.env.STRIPE_MIN_AMOUNT_PAISE || "5000");
      if (amountInPaise < minAmountPaise) {
        console.log("Amount below minimum:", { amountInPaise, minAmountPaise });
        return {
          success: false,
          message: `Final amount must be at least ₹${minAmountPaise / 100} (${minAmountPaise} paise)`,
        };
      }

      const instructorPayoutAmount = Math.round(finalAmount * 0.7);
      const adminPayoutAmount = finalAmount - instructorPayoutAmount;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInPaise,
        currency: "inr",
        payment_method_types: ["card"],
        metadata: { userId, courseId, couponId: couponId || "" },
      });

      const payment = await this.paymentRepository.createPayment({
        userId: userObjectId,
        courseId: courseObjectId,
        paymentType,
        status: "pending",
        amount: finalAmount,
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

      console.log("Payment intent created successfully:", {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
      });
      return {
        success: true,
        message: "Payment intent created successfully",
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentId: payment._id,
        },
      };
    } catch (error: any) {
      console.error("Error creating payment intent:", error.message || error);
      return { success: false, message: error.message || "Failed to create payment intent" };
    }
  }

  async confirmPayment(paymentId: string): Promise<IResponse> {
    try {
      console.log("Confirming payment:", { paymentId });

      const payment = await this.paymentRepository.findById(paymentId);
      if (!payment) {
        console.log("Payment not found:", { paymentId });
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

        const couponId = paymentIntent.metadata?.couponId;
        if (couponId && Types.ObjectId.isValid(couponId)) {
          const hasUsedCoupon = await this._couponUsageRepository.hasUserUsedCoupon(
            payment.userId.toString(),
            couponId
          );
          if (hasUsedCoupon) {
            console.log("Coupon already used, skipping recording:", {
              userId: payment.userId,
              couponId,
            });
          } else {
            await this._couponUsageRepository.recordCouponUsage(
              payment.userId.toString(),
              couponId,
              payment.courseId.toString()
            );
            console.log("Coupon usage recorded after payment confirmation:", {
              userId: payment.userId,
              couponId,
              courseId: payment.courseId,
            });
          }
        }

        console.log("Payment confirmed successfully:", { paymentId, enrollmentId: enrollment._id });
        return {
          success: true,
          message: "Payment confirmed successfully",
          data: { payment: updatedPayment, enrollment },
        };
      } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "requires_action") {
        console.log("Payment requires additional action:", { paymentId, paymentIntentStatus: paymentIntent.status });
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
        console.log("Payment failed:", { paymentId, paymentIntentStatus: paymentIntent.status });
        return { success: false, message: "Payment failed" };
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error.message || error);
      await this.paymentRepository.updatePaymentStatus(paymentId, "failed");
      await this.paymentRepository.update(
        { _id: paymentId },
        {
          "instructorPayout.status": "failed",
          "adminPayout.status": "failed",
        }
      );
      return { success: false, message: error.message || "Failed to confirm payment" };
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
    sort?: { field: string; order: "asc" | "desc" },
    courseFilter?: string
  ): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(instructorId)) {
        return { success: false, message: "Invalid instructorId" };
      }

      const result = await this.paymentRepository.getInstructorPayouts(
        instructorId,
        page,
        limit,
        search,
        sort,
        courseFilter
      );

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
    sort?: { field: string; order: "asc" | "desc" },
    courseFilter?: string
  ): Promise<IResponse> {
    try {
      const result = await this.paymentRepository.getAdminPayouts(page, limit, search, sort, courseFilter);

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


  async createSubscription(
    userId: string,
    plan: "monthly" | "yearly",
    paymentType: "debit" | "credit"
  ): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid userId" };
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const existingSubscription = await this._subscriptionRepository.findByUserId(userId);
      if (existingSubscription && existingSubscription.status === "active") {
        return { success: false, message: "User already has an active subscription" };
      }

      const priceId =
        plan === "monthly"
          ? process.env.STRIPE_MONTHLY_PRICE_ID
          : process.env.STRIPE_YEARLY_PRICE_ID;

      if (!priceId) {
        return { success: false, message: "Invalid plan configuration" };
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId },
        });
        customerId = customer.id;
        await this.userRepository.update(
          { _id: new Types.ObjectId(userId) },
          { stripeCustomerId: customerId }
        );
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { payment_method_types: ["card"] },
        expand: ["latest_invoice.payment_intent"],
      });
      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);

      const newSubscription = await this._subscriptionRepository.createSubscription({
        userId: new Types.ObjectId(userId),
        plan,
        stripeSubscriptionId: subscription.id,
        status: "pending",
        startDate,
        endDate,
      });

      const paymentIntent = (subscription.latest_invoice as any).payment_intent;
      if (!paymentIntent || !paymentIntent.client_secret) {
        return { success: false, message: "Failed to create payment intent for subscription" };
      }

      console.log("Created subscription:", {
        subscriptionId: newSubscription._id,
        startDate: newSubscription.startDate,
        endDate: newSubscription.endDate,
        plan: newSubscription.plan,
      });

      return {
        success: true,
        message: "Subscription created successfully",
        data: {
          clientSecret: paymentIntent.client_secret,
          subscriptionId: newSubscription._id,
          stripeSubscriptionId: subscription.id,
        },
      };
    } catch (error: any) {
      console.error("Error creating subscription:", error.message || error);
      return { success: false, message: "Failed to create subscription" };
    }
  }

  async confirmSubscription(subscriptionId: string): Promise<IResponse> {
    try {
      const subscription = await this._subscriptionRepository.findById(subscriptionId);
      if (!subscription) {
        return { success: false, message: "Subscription not found" };
      }

      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      if (stripeSubscription.status === "active") {
        const endDate = new Date(stripeSubscription.current_period_end * 1000);
        await this._subscriptionRepository.updateSubscription(subscriptionId, {
          status: "active",
          endDate,
        });

        await this.userRepository.update(
          { _id: subscription.userId },
          { subscriptionStatus: "active" }
        );

        console.log("Confirmed subscription:", {
          subscriptionId,
          status: "active",
          endDate,
        });

        return {
          success: true,
          message: "Subscription confirmed successfully",
          data: { subscription },
        };
      } else if (stripeSubscription.status === "incomplete" || stripeSubscription.status === "past_due") {
        return { success: false, message: "Subscription requires additional action" };
      } else {
        await this._subscriptionRepository.updateSubscription(subscriptionId, {
          status: "canceled",
        });
        return { success: false, message: "Subscription payment failed" };
      }
    } catch (error: any) {
      console.error("Error confirming subscription:", error.message || error);
      await this._subscriptionRepository.updateSubscription(subscriptionId, {
        status: "canceled",
      });
      return { success: false, message: "Failed to confirm subscription" };
    }
  }


  async getSubscriptionStatus(userId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid userId" };
      }

      const subscription = await this._subscriptionRepository.findByUserId(userId);
      if (!subscription) {
        return {
          success: true,
          message: "No subscription found",
          data: { hasActiveSubscription: false },
        };
      }

      console.log("Subscription details from DB:", {
        subscriptionId: subscription._id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        plan: subscription.plan,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      });

      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      console.log("Stripe subscription status:", {
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      });

      if (stripeSubscription.status === "active") {
        const periodEnd = new Date(stripeSubscription.current_period_end * 1000);
        await this._subscriptionRepository.updateSubscription(subscription._id.toString(), {
          status: "active",
          endDate: periodEnd,
        });
        await this.userRepository.update(
          { _id: userId },
          { subscriptionStatus: "active" }
        );
        return {
          success: true,
          message: "Active subscription found",
          data: { hasActiveSubscription: true, plan: subscription.plan },
        };
      } else {
        let newStatus: "canceled" | "expired" | "past_due" = "canceled";
        if (stripeSubscription.status === "past_due") {
          newStatus = "past_due";
        } else if (new Date(subscription.endDate) <= new Date()) {
          newStatus = "expired";
        }

        await this._subscriptionRepository.updateSubscription(subscription._id.toString(), {
          status: newStatus,
          endDate: newStatus === "past_due" ? subscription.endDate : new Date(),
        });
        await this.userRepository.update(
          { _id: userId },
          { subscriptionStatus: "inactive" }
        );
        return {
          success: true,
          message: "No active subscription",
          data: { hasActiveSubscription: false },
        };
      }
    } catch (error: any) {
      console.error("Error checking subscription status:", error.message || error);
      return { success: false, message: "Failed to check subscription status" };
    }
  }
}

export default PaymentService;