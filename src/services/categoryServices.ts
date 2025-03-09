// CategoryService.ts
import CategoryRepository from '../repositories/categoryRepository';
import { IResponse } from '../interfaces/IResponse';
import { ICategoryService } from '../interfaces/IServices';
import { CategoryDoc } from '../interfaces/ICategory';
import { CustomError } from '../utils/CustomError';


export class CategoryService implements ICategoryService {
    private _categoryRepository: CategoryRepository;

    constructor(categoryRepository: CategoryRepository) {
        this._categoryRepository = categoryRepository;
    }

    // Create a new category
    async createCategory(categoryData: Partial<CategoryDoc>): Promise<IResponse> {
        try {
            if (!categoryData.categoryName) {
                return {
                    success: false,
                    message: "Category name is required."
                };
            }

            const existingCategory = await this._categoryRepository.findByName(categoryData.categoryName);
            if (existingCategory) {
                return {
                    success: false,
                    message: "Category already exists."
                };
            }

            const newCategory = await this._categoryRepository.create(categoryData);
            return {
                success: true,
                message: "Category created successfully.",
                data: newCategory
            };
        } catch (error) {
            console.error("Error updating user profile:", error);
            if (error instanceof CustomError) {
                return {
                    success: false,
                    message: error.message,
                    error: {
                        message: error.message,
                        field: error.field,
                        statusCode: error.statusCode
                    }
                };
            }
            return {
                success: false,
                message: "An error occurred while updating the profile.",
                error: {
                    message: "An error occurred while updating the profile."
                }
            };
        }
    }


    // Get all categories
    async getAllCategories(page: number, limit: number): Promise<IResponse> {
        try {
            const skip = (page - 1) * limit;

            const categories = await this._categoryRepository.findAll(
                {},
                skip,
                { createdAt: -1 },
                limit
            );

            console.log("Categories found:", categories);

            const totalCategories = await this._categoryRepository.count({});

            return {
                success: true,
                message: "Categories fetched successfully",
                data: {
                    categories,
                    totalCategories,
                    totalPages: Math.ceil(totalCategories / limit),
                    currentPage: page,
                },
            };
        } catch (error) {
            console.error("Error fetching categories:", error);
            return {
                success: false,
                message: "Failed to fetch categories. Please try again.",
            };
        }
    }


    // Update an existing category
    async editCategory(categoryId: string, categoryData: Partial<CategoryDoc>): Promise<IResponse> {
        try {
            if (!categoryData.categoryName) {
                return {
                    success: false,
                    message: "Category name is required."
                };
            }

            const duplicateCategory = await this._categoryRepository.findByQuery({ categoryName: categoryData.categoryName });

            if (duplicateCategory) {

                return {
                    success: false,
                    message: "Category with this name already exists."
                };

            }

            const updatedCategory = await this._categoryRepository.update(categoryId, categoryData);

            return {
                success: true,
                message: "Category updated successfully.",
                data: updatedCategory
            };

        } catch (error) {
            console.error("Error updating category:", error);
            return {
                success: false,
                message: "Failed to update category. Please try again."
            };
        }
    }

    
    //delete category
    async deleteCategory(categoryId: string): Promise<IResponse> {
        try {
            const category = await this._categoryRepository.findById(categoryId);
            if (!category) {
                return {
                    success: false,
                    message: "Category not found.",
                };
            }

            const newActiveStatus = !category.isActive;

            const updatedCategory = await this._categoryRepository.update(categoryId, {
                isActive: newActiveStatus,
            });

            if (!updatedCategory) {
                return {
                    success: false,
                    message: "Failed to toggle category status.",
                };
            }

            return {
                success: true,
                message: `Category ${newActiveStatus ? "restored" : "deleted"} successfully.`,
                data: updatedCategory,
            };
        } catch (error) {
            console.error(`Error toggling category with ID ${categoryId}:`, error);
            return {
                success: false,
                message: "Failed to toggle category status. Please try again.",
            };
        }
    }

}