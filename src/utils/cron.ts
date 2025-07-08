import { CronJob } from "cron";
import { Subscription } from "../models/subscriptionModel";
import { IPaymentService } from "../interfaces/IServices";

export class SubscriptionCron {
  private paymentService: IPaymentService;

  constructor(paymentService: IPaymentService) {
    this.paymentService = paymentService;
  }

  start() {

    new CronJob(
      "0 0 * * *",
      async () => {
        try {
          console.log("Running subscription status check cron job");
          const subscriptions = await Subscription.find({
            status: { $in: ["active", "past_due"] },
          });

          for (const subscription of subscriptions) {
            await this.paymentService.getSubscriptionStatus(subscription.userId.toString());
          }
          console.log("Subscription status check completed");
        } catch (error) {
          console.error("Error in subscription cron job:", error);
        }
      },
      null,
      true,
      "Asia/Kolkata"
    );
  }
}