import { BaseRepository } from "./baseRepository";
import { Offer, IOffer } from "../models/offerModel";
import { Types, UpdateQuery, QueryOptions } from "mongoose";

export class OfferRepository extends BaseRepository<IOffer> {
  constructor() {
    super(Offer);
  }

  async createOffer(offerData: Partial<IOffer>): Promise<IOffer> {
    try {
      const offer = await this._model.create(offerData);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw new Error("Could not create offer");
    }
  }

  async findByCategoryId(categoryId: string): Promise<IOffer | null> {
    return this.findByQuery({ categoryId }); 
  }

  async updateOffer(offerId: string, offerData: UpdateQuery<IOffer>, options: QueryOptions = { new: true }): Promise<IOffer | null> {
    try {
      const updatedOffer = await this._model.findByIdAndUpdate(
        offerId,
        offerData,
        { ...options, new: true }
      );
      return updatedOffer;
    } catch (error) {
      console.error("Error updating offer:", error);
      throw new Error("Could not update offer");
    }
  }

  async deleteOffer(offerId: string): Promise<boolean> {
    try {
      const result = await this._model.findByIdAndDelete(offerId);
      return result !== null;
    } catch (error) {
      console.error("Error deleting offer:", error);
      throw new Error("Could not delete offer");
    }
  }

  async findActiveOffers(categoryId?: string): Promise<IOffer[]> {
    try {
      const now = new Date();
      const query: any = { expirationDate: { $gte: now } };
      if (categoryId && Types.ObjectId.isValid(categoryId)) {
        query.categoryId = new Types.ObjectId(categoryId);
      }
      return await this._model.find(query).populate('categoryId');
    } catch (error) {
      console.error("Error finding active offers:", error);
      throw new Error("Could not find active offers");
    }
  }

  async findAllOffers(
    page: number = 1, 
    limit: number = 10, 
    search?: string
  ): Promise<{ offers: IOffer[], total: number, page: number, totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Build aggregation pipeline
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryId'
          }
        },
        {
          $unwind: '$categoryId'
        }
      ];

      // Add search filter if search term exists
      if (search && search.trim() !== '') {
        pipeline.push({
          $match: {
            'categoryId.categoryName': { $regex: search.trim(), $options: 'i' }
          }
        });
      }

      // Get total count
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this._model.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Get paginated results
      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      );

      const offers = await this._model.aggregate(pipeline);

      return {
        offers,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error("Error fetching all offers:", error);
      throw new Error("Could not fetch all offers");
    }
  }

  async countActiveOffers(categoryId?: string): Promise<number> {
    try {
      const now = new Date();
      const query: any = { expirationDate: { $gte: now } };
      if (categoryId && Types.ObjectId.isValid(categoryId)) {
        query.categoryId = new Types.ObjectId(categoryId);
      }
      return await this._model.countDocuments(query);
    } catch (error) {
      console.error("Error counting active offers:", error);
      throw new Error("Could not count active offers");
    }
  }
}