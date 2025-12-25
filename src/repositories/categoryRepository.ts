import { FilterQuery } from "mongoose";
import { Category } from "../models/categoryModel";
import { BaseRepository } from "./baseRepository";
import { ICategoryRepository } from "../interfaces/IRepositories";
import { CategoryDoc } from "../interfaces/ICategory";

export class CategoryRepository
  extends BaseRepository<CategoryDoc>
  implements ICategoryRepository {

  constructor() {
    super(Category);
  }

  async findByName(categoryName: string): Promise<CategoryDoc | null> {
    return this._model.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, "i") },
    });
  }

  async toggleCategoryStatus(
    categoryId: string,
    isActive: boolean
  ): Promise<CategoryDoc | null> {
    return this.update({ _id: categoryId }, { isActive }, { new: true });
  }

  async getAllCategories(
    skip: number,
    limit: number,
    search?: string
  ): Promise<CategoryDoc[]> {

    const query: FilterQuery<CategoryDoc> = {};

    if (search) {
      query.categoryName = { $regex: search, $options: "i" };
    }

    return this._model
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countCategories(search?: string): Promise<number> {
    const query: FilterQuery<CategoryDoc> = {};

    if (search) {
      query.categoryName = { $regex: search, $options: "i" };
    }

    return this._model.countDocuments(query);
  }
}

export default CategoryRepository;
