import { IOffer } from "../models/offerModel";
import { IResponse } from "../interfaces/IResponse";
import { IOfferRepository, ICategoryRepository, ICourseRepository } from "../interfaces/IRepositories";
import { Types } from "mongoose";

export class OfferService {
  constructor(
    private _offerRepository: IOfferRepository,
    private _categoryRepository: ICategoryRepository,
    private _courseRepository: ICourseRepository 
  ) {}

  async addOffer(offerData: Partial<IOffer>): Promise<IResponse> {
    try {
      if (!offerData.discountPercentage || !offerData.expirationDate || !offerData.categoryId) {
        return {
          success: false,
          message: "Missing required fields: discountPercentage, expirationDate, categoryId",
        };
      }

      if (offerData.discountPercentage < 0 || offerData.discountPercentage > 100) {
        return {
          success: false,
          message: "Discount percentage must be between 0 and 100",
        };
      }

      if (!Types.ObjectId.isValid(offerData.categoryId)) {
        return {
          success: false,
          message: "Invalid category ID",
        };
      }

      const category = await this._categoryRepository.findById(offerData.categoryId.toString());
      if (!category) {
        return {
          success: false,
          message: "Category not found",
        };
      }
      if (!category.isActive) {
        return {
          success: false,
          message: "Category is not active",
        };
      }

      const now = new Date();
      if (new Date(offerData.expirationDate) < now) {
        return {
          success: false,
          message: "Expiration date must be in the future",
        };
      }

      const categoryIdString = offerData.categoryId.toString();
      const existingOffer = await this._offerRepository.findByCategoryId(categoryIdString);
      let offer;

      if (existingOffer) {
        const updateResult = await this.editOffer((existingOffer._id as Types.ObjectId).toString(), offerData);
        if (!updateResult.success) {
          return updateResult;
        }
        offer = updateResult.data;
      } else {
        offer = await this._offerRepository.createOffer(offerData);
      }

      // Update all courses in the category with the offer details
      const courses = await this._courseRepository.findByCategoryId(categoryIdString);
      for (const course of courses) {
        const originalPrice = course.pricing.amount;
        const offerPrice = Math.round(originalPrice * (1 - offerData.discountPercentage / 100));
        await this._courseRepository.update(
          { _id: course._id },
          {
            offer: {
              discountPercentage: offerData.discountPercentage,
              offerPrice,
              expirationDate: offerData.expirationDate,
            },
          }
        );
        console.log(`Updated course ${course._id} with offer:`, {
          discountPercentage: offerData.discountPercentage,
          offerPrice,
          expirationDate: offerData.expirationDate,
        });
      }

      return {
        success: true,
        message: existingOffer ? "Existing offer updated successfully" : "Offer created successfully",
        data: offer,
      };
    } catch (error) {
      console.error("Error adding offer:", error);
      return {
        success: false,
        message: "Failed to create offer",
      };
    }
  }

  async editOffer(offerId: string, offerData: Partial<IOffer>): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(offerId)) {
        return {
          success: false,
          message: "Invalid offer ID",
        };
      }

      if (offerData.discountPercentage && (offerData.discountPercentage < 0 || offerData.discountPercentage > 100)) {
        return {
          success: false,
          message: "Discount percentage must be between 0 and 100",
        };
      }

      if (offerData.expirationDate && new Date(offerData.expirationDate) < new Date()) {
        return {
          success: false,
          message: "Expiration date must be in the future",
        };
      }

      let categoryId = offerData.categoryId;
      if (categoryId) {
        if (!Types.ObjectId.isValid(categoryId)) {
          return {
            success: false,
            message: "Invalid category ID",
          };
        }
        const category = await this._categoryRepository.findById(categoryId.toString());
        if (!category) {
          return {
            success: false,
            message: "Category not found",
          };
        }
        if (!category.isActive) {
          return {
            success: false,
            message: "Category is not active",
          };
        }
      } else {
        // If categoryId is not provided, use the existing offer's categoryId
        const existingOffer = await this._offerRepository.findById(offerId);
        if (!existingOffer) {
          return {
            success: false,
            message: "Offer not found",
          };
        }
        categoryId = existingOffer.categoryId;
      }

      const updatedOffer = await this._offerRepository.updateOffer(offerId, offerData, { new: true });
      if (!updatedOffer) {
        return {
          success: false,
          message: "Failed to update offer",
        };
      }

      // Update all courses in the category with the updated offer details
      const courses = await this._courseRepository.findByCategoryId(categoryId.toString());
      for (const course of courses) {
        const originalPrice = course.pricing.amount;
        const offerPrice = Math.round(originalPrice * (1 - (offerData.discountPercentage || updatedOffer.discountPercentage) / 100));
        await this._courseRepository.update(
          { _id: course._id },
          {
            offer: {
              discountPercentage: offerData.discountPercentage || updatedOffer.discountPercentage,
              offerPrice,
              expirationDate: offerData.expirationDate || updatedOffer.expirationDate,
            },
          }
        );
        console.log(`Updated course ${course._id} with offer:`, {
          discountPercentage: offerData.discountPercentage || updatedOffer.discountPercentage,
          offerPrice,
          expirationDate: offerData.expirationDate || updatedOffer.expirationDate,
        });
      }

      return {
        success: true,
        message: "Offer updated successfully",
        data: updatedOffer,
      };
    } catch (error) {
      console.error("Error editing offer:", error);
      return {
        success: false,
        message: "Failed to update offer",
      };
    }
  }

  async deleteOffer(offerId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(offerId)) {
        return {
          success: false,
          message: "Invalid offer ID",
        };
      }

      const offer = await this._offerRepository.findById(offerId);
      if (!offer) {
        return {
          success: false,
          message: "Offer not found or already deleted",
        };
      }

      // Remove offer from all courses in the category
      const courses = await this._courseRepository.findByCategoryId(offer.categoryId.toString());
      for (const course of courses) {
        await this._courseRepository.update(
          { _id: course._id },
          { $unset: { offer: "" } }
        );
        console.log(`Removed offer from course ${course._id}`);
      }

      const deleted = await this._offerRepository.deleteOffer(offerId);
      if (!deleted) {
        return {
          success: false,
          message: "Offer not found or already deleted",
        };
      }

      return {
        success: true,
        message: "Offer deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting offer:", error);
      return {
        success: false,
        message: "Failed to delete offer",
      };
    }
  }

  async getAllOffers(page: number = 1, limit: number = 10, search?: string): Promise<IResponse> {
    try {
      const result = await this._offerRepository.findAllOffers(page, limit, search);
      return {
        success: true,
        message: "Offers fetched successfully",
        data: {
          offers: result.offers,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      console.error("Error fetching all offers:", error);
      return {
        success: false,
        message: "Failed to fetch offers",
      };
    }
  }

  async getActiveOffers(categoryId?: string): Promise<IResponse> {
    try {
      const offers = await this._offerRepository.findActiveOffers(categoryId);
      return {
        success: true,
        message: "Active offers fetched successfully",
        data: offers,
      };
    } catch (error) {
      console.error("Error fetching active offers:", error);
      return {
        success: false,
        message: "Failed to fetch active offers",
      };
    }
  }

  async checkOfferUsage(userId: string, offerId: string): Promise<IResponse> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(offerId)) {
        return {
          success: false,
          message: "Invalid user ID or offer ID",
        };
      }

      const offer = await this._offerRepository.findById(offerId);
      if (!offer) {
        return {
          success: false,
          message: "Offer not found",
        };
      }

      const now = new Date();
      if (offer.expirationDate < now) {
        return {
          success: false,
          message: "Offer has expired",
        };
      }

      return {
        success: true,
        message: "Offer applied successfully",
        data: { offer },
      };
    } catch (error) {
      console.error("Error checking offer usage:", error);
      return {
        success: false,
        message: "Failed to apply offer",
      };
    }
  }
}