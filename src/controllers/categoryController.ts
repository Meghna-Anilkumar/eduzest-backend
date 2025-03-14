import { Request, Response } from "express";
import { CategoryService } from "../services/categoryServices";
import { Status } from "../utils/enums";

class CategoryController {
    private _categoryService: CategoryService;

    constructor(categoryService: CategoryService) {
        this._categoryService = categoryService;
    }

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
                message: "Internal server error.",
            });
        }
    }

    // Get all categories
    async getAllCategories(req: Request, res: Response): Promise<void> {
        try {
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 10;

            const response = await this._categoryService.getAllCategories(page, limit);
            res.status(response.success ? Status.OK : Status.BAD_REQUEST).json(response);
        } catch (error) {
            console.error("Error in getAllCategories controller:", error);
            res.status(Status.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error.",
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
            message: "Internal server error.",
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
            message: "Internal server error.",
          });
        }
      }
}

export default CategoryController;


