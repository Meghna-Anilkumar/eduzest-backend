import { model, Schema } from 'mongoose';
import { AdminDoc } from '../interfaces/IAdmin'
const adminSchema = new Schema<AdminDoc>({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "Admin"
    },
    refreshToken: {
        type: String,
        default: null
    },
    refreshTokenExpires: {
        type: Date,
        default: null
    }

})

export const Admin = model<AdminDoc>('Admin', adminSchema);