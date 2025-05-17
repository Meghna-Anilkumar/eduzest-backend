import { Request, Response } from "express";
import { Status } from "../utils/enums";
import { ICategoryService } from "../interfaces/IServices";
import { MESSAGE_CONSTANTS } from "../constants/message_constants";

class CategoryController {
  constructor(private _categoryService: ICategoryService) {}

    // Create a new category
    async createCategory(req: Request, res: Response): Promise<void> {
        try {
            const response = await this._categoryService.createCategory(req.body);
            console.log(req.body);
            res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
            console.error("Error in createCategory controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }

    // Get all categories with pagination
    async getAllCategories(req: Request, res: Response): Promise<void> {
        try {
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 10;
            const search = req.query.search as string | undefined; 

            const response = await this._categoryService.getAllCategories(page, limit,search);
            res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
            console.error("Error in getAllCategories controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
            });
        }
    }

    // Edit a category 
    async editCategory(req: Request, res: Response): Promise<void> {
        try {
          const { categoryId } = req.params; 
          const updatedData = req.body; 
          const response = await this._categoryService.editCategory(categoryId, updatedData);
          res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
          console.error("Error in editCategory controller:", error);
          res.status(Status.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
          });
        }
      }

      async deleteCategory(req: Request, res: Response): Promise<void> {
        try {
          const { categoryId } = req.params; 
          const response = await this._categoryService.deleteCategory(categoryId);
          res
            .status(response.success ? Status.OK : Status.BAD_REQUEST)
            .json(response);
        } catch (error) {
          console.error("Error in deleteCategory controller:", error);
          res.status(Status.INTERNAL_SERVER_ERROR).json({
            success: false,
            message:MESSAGE_CONSTANTS.INTERNAL_SERVER_ERROR
          });
        }
      }
}

export default CategoryController;


