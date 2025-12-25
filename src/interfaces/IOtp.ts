import { HydratedDocument } from "mongoose";

export interface IOtp {
  email: string;
  otp: number;
  userData: { name: string; password: string };
  createdAt?: Date;
  expiresAt: Date;
}

export type OtpDoc = HydratedDocument<IOtp>;
