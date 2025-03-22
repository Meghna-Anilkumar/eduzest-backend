import { Document,Types} from "mongoose";

export interface CategoryDoc extends Document{
    _id: Types.ObjectId;
    categoryName: string;
    isActive:boolean;
}