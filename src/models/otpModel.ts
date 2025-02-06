import { model, Schema } from 'mongoose';
import { OtpDoc } from '../interfaces/IOtp';


const OTPSchema = new Schema<OtpDoc>({
  email: {
    type: String,
    required: true
  },
  otp: {
    type: Number,
    required: true
  },
  userData: {
    name: String,
    password: String
},
  createdAt: {
    type: Date,
    default: Date.now,
    // expires: 60 * 2
  },
  expiresAt:{
    type: Date
  }
});

export const OTP = model<OtpDoc>('OTP', OTPSchema);