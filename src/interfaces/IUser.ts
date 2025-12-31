import { Document, ObjectId, Decimal128, Types } from "mongoose";

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  isVerified: boolean;
  profile?: {
    dob?: string;
    gender?: "Male" | "Female" | "Other";
    profilePic?: string | null;
    address?: string;
  };
  updatedAt?: Date;
  role: "Student" | "Instructor" | "Admin";
  createdAt?: Date;
  isBlocked?: boolean;
  password: string;
  phone?: number;
  qualification?: string;
  studentDetails?: {
    additionalEmail?: string;
    enrolledCourses?: {
      courseId: ObjectId;
      progress?: number;
      rating?: string;
    }[];
  };
  instructorDetails?: {
    createdCourses?: Types.ObjectId[];
    profit?: number;
    rating?: number;
  };
  socialMedia?: {
    linkedin?: string;
    github?: string;
  };
  isGoogleAuth?: boolean;
  aboutMe?: string;
  cv?: string;
  isRequested?: boolean;
  isRejected?: boolean;
  isApproved?: boolean;
  experience: string;
  refreshToken?: string;
  refreshTokenExpires?: Date;
  stripeCustomerId?: string;
  subscriptionStatus?: "active" | "inactive";
}
