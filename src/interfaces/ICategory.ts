import { Document} from "mongoose";

export interface CategoryDoc extends Document{
    categoryName: string;
    isActive:boolean;
}