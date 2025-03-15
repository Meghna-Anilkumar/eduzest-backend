import { CategoryDoc } from '../interfaces/ICategory';
import { Category } from '../models/categoryModel';
import { BaseRepository } from './baseRepository';

export class CategoryRepository extends BaseRepository<CategoryDoc> {
    constructor() {
        super(Category);
    }

    async findByName(categoryName: string): Promise<CategoryDoc | null> {
        return this._model.findOne({ categoryName });
    }

    // Toggle the isActive status of a category (soft delete/restore)
    async toggleCategoryStatus(id: string, isActive: boolean): Promise<CategoryDoc | null> {
        return this.update(
            { _id: id },
            { isActive },
            { new: true }
        );
    }

    // Get only active categories
    async getActiveCategories(skip: number, limit: number): Promise<CategoryDoc[]> {
        return this.findAll(
            { isActive: true },
            skip,
            { createdAt: -1 }, // Sort by createdAt in descending order
            limit
        );
    }

    // Count only active categories
    async countActiveCategories(): Promise<number> {
        return this.count({ isActive: true });
    }
}

export default CategoryRepository;