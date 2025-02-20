import { model, Schema, Types } from 'mongoose';
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
    role:{
        type:String,
        default:"Admin"
    }

})

export const Admin = model<AdminDoc>('Admin', adminSchema);