import { Document, ObjectId } from "mongoose";

export interface UserDoc extends Document {
  email: string;
  name: string;
  isVerified:Boolean;
  profile?: {
    dob?: Date;
    firstName?: string;
    gender?: "Male" | "Female" | "Other" | string;
    lastName?: string;
    profilePic?: string;
  };
  updatedAt?: Date;
  role?: "Student" | "Instructor" | "Admin";
  createdAt?: Date;
  isBlocked?: boolean;
  password: string;
  studentDetails?: {
    additionalEmail?: string;
    enrolledCourses?: {
      courseId: ObjectId;
      progress: number;
      rating: string;
    }[];
    phone?: number;
    address?:string;
    socialMedia?: string[];
  };
  instructorDetails?: {
    createdCourses?: ObjectId[];
    profit?: number;
    rating?: number;
  };
}
