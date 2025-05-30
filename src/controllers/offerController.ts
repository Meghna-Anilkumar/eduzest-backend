import { Request, Response } from "express";
import { IOfferService } from "../interfaces/IServices";
import { AuthRequest } from "../interfaces/AuthRequest";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";

export class OfferController {
  constructor(
    private _offerService: IOfferService
  ) {}

  async addOffer(req: Request, res: Response) {
    try {
      const offerData = req.body;
      const result = await this._offerService.addOffer(offerData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error("Error in addOffer controller:", error);
      res.status(500).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async editOffer(req: Request, res: Response) {
    try {
      const offerId = req.params.id;
      const offerData = req.body;
      const result = await this._offerService.editOffer(offerId, offerData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in editOffer controller:", error);
      res.status(500).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async deleteOffer(req: Request, res: Response) {
    try {
      const offerId = req.params.id;
      const result = await this._offerService.deleteOffer(offerId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in deleteOffer controller:", error);
      res.status(500).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getAllOffers(req: Request, res: Response) {
    try {
      const { page = "1", limit = "10" } = req.query;
      const result = await this._offerService.getAllOffers(Number(page), Number(limit));
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in getAllOffers controller:", error);
      res.status(500).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async getActiveOffers(req: Request, res: Response) {
    try {
      const { categoryId } = req.query;
      const result = await this._offerService.getActiveOffers(categoryId as string);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in getActiveOffers controller:", error);
      res.status(500).json({
        success: false,
        message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
      });
    }
  }

  async checkOfferUsage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { offerId } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: MESSAGE_CONSTANTS.UNAUTHORIZED });
        return;
      }
      const result = await this._offerService.checkOfferUsage(userId, offerId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in checkOfferUsage:", error);
      res.status(500).json({ success: false, message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR });
    }
  }
}