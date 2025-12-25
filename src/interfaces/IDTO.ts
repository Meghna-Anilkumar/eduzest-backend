export interface StudentDTO {
  _id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  profile?: {
    dob?: string;
    gender?: string;
    profilePic?: string|null;
    address?: string;
  };
  enrolledCourses?: Array<{
    courseId: string;
    progress?: number;
    rating?: string;
  }>;
}

export interface InstructorDTO {
  _id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  isApproved: boolean;
  isRequested: boolean;
  isRejected: boolean;
  qualification?: string;
  experience?: string;
  aboutMe?: string;
  socialMedia?: {
    linkedin?: string;
    github?: string;
  };
  createdCourses?: string[];
  profit?: number;
  rating?: number;
}