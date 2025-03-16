import { Category } from "../models/categoryModel";
import { BaseRepository } from "./baseRepository";
import { ICategoryRepository } from "../interfaces/IRepositories";
import { CategoryDoc } from "../interfaces/ICategory";

export class CategoryRepository extends BaseRepository<CategoryDoc> implements ICategoryRepository {
    constructor() {
        super(Category);
    }

    async findByName(categoryName: string): Promise<CategoryDoc | null> {
        return this._model.findOne({ name: categoryName });
    }

    async toggleCategoryStatus(id: string, isActive: boolean): Promise<CategoryDoc | null> {
        return this.update({ _id: id }, { isActive }, { new: true });
    }

    async getAllCategories(skip: number, limit: number, search?: string): Promise<CategoryDoc[]> {
        const query: any = {};
        if (search) {
            query.categoryName = { $regex: search, $options: "i" }; 
            console.log("getAllCategories query:", query);
        }
        const categories = await this._model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
        console.log("Fetched categories:", categories.map(c => c.categoryName));
        return categories;
    }

    async countCategories(search?: string): Promise<number> {
        const query: any = {};
        if (search) {
            query.categoryName = { $regex: search, $options: "i" }; 
            console.log("countCategories query:", query);
        }
        const count = await this._model.countDocuments(query);
        console.log("Total categories count:", count);
        return count;
    }
}

export default CategoryRepository;