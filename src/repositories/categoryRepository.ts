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
}

export default CategoryRepository;