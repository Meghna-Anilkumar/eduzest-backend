import { Types } from "mongoose";
import { ISubscription } from "../models/subscriptionModel";
import { Subscription } from "../models/subscriptionModel";
import { ISubscriptionRepository } from "../interfaces/IRepositories";


export class SubscriptionRepository implements ISubscriptionRepository {
  async createSubscription(data: Partial<ISubscription>): Promise<ISubscription> {
    return await Subscription.create(data);
  }

  async findByUserId(userId: string): Promise<ISubscription | null> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    // return await Subscription.findOne({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).exec();


    let subscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      status: "active",
    }).sort({ createdAt: -1 });

    if (!subscription) {
      subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
      }).sort({ createdAt: -1 });
    }

    return subscription;

  }

  async findById(id: string): Promise<ISubscription | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subscriptionId");
    }
    return await Subscription.findById(id);
  }

  async updateSubscription(id: string, data: Partial<ISubscription>): Promise<ISubscription | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subscriptionId");
    }
    return await Subscription.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteSubscription(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subscriptionId");
    }
    const result = await Subscription.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
