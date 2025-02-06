import { Document } from "mongoose"


export interface OtpDoc extends Document {
    email: string;
    otp: number;
    userData: {
        name: string;
        password: string;
    };
    createdAt?: Date;
    expiresAt:Date
}