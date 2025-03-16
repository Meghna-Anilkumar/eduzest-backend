import { Document, ObjectId } from "mongoose";

export interface AdminDoc extends Document{
    _id:string;
    email:string;
    password:string;
    role:string;
}