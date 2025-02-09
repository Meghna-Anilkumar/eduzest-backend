import { Document, ObjectId } from "mongoose";

export interface AdminDoc extends Document{
    email:string;
    password:string
}