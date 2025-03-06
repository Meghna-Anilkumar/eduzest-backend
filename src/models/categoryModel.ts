import { model, Schema, Types } from 'mongoose';
import { CategoryDoc } from '../interfaces/ICategory'

const categorySchema = new Schema<CategoryDoc>({
    categoryName: {
        type: String,
        required: true
    },
    isActive:{
        type:Boolean,
        default:true
    }

})

export const Category = model<CategoryDoc>('Category', categorySchema);