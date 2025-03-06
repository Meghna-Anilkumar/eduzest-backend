import { CategoryDoc } from "../interfaces/ICategory";
import {Category} from "../models/categoryModel";
import { BaseRepository } from "./baseRepository";

class CategoryRepository extends BaseRepository<CategoryDoc>{

    constructor() {
        super(Category)
    }
 
    
}

export default CategoryRepository;