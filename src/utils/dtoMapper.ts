import { StudentDTO, InstructorDTO } from '../interfaces/IDTO';

interface Profile {
  dob?: string;
  gender?: string;
  profilePic?: string|null;
  address?: string;
}

interface EnrolledCourse {
  courseId: { toString(): string } | string;
  progress?: number;
  rating?: string;
}

interface StudentDetails {
  enrolledCourses?: EnrolledCourse[];
}

interface SocialMedia {
  linkedin?: string;
  github?: string;
}

interface InstructorDetails {
  createdCourses?: Array<{ toString(): string } | string>;
  profit?: number;
  rating?: number;
}

interface UserDocBase {
  _id: { toString(): string };
  name: string;
  email: string;
  isBlocked?: boolean;
  profile?: Profile;
}

interface StudentUserDoc extends UserDocBase {
  studentDetails?: StudentDetails;
}

interface InstructorUserDoc extends UserDocBase {
  isApproved?: boolean;
  isRequested?: boolean;
  isRejected?: boolean;
  qualification?: string;
  experience?: string;
  aboutMe?: string;
  socialMedia?: SocialMedia;
  instructorDetails?: InstructorDetails;
}

export class DTOMapper {

  static mapToStudentDTO(user: StudentUserDoc): StudentDTO {
    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      isBlocked: user.isBlocked ?? false,
      profile: user.profile
        ? {
            dob: user.profile.dob,
            gender: user.profile.gender,
            profilePic: user.profile.profilePic,
            address: user.profile.address,
          }
        : undefined,
      enrolledCourses: user.studentDetails?.enrolledCourses?.map((course) => ({
        courseId: typeof course.courseId === 'string' 
          ? course.courseId 
          : course.courseId.toString(),
        progress: course.progress,
        rating: course.rating,
      })),
    };
  }


  static mapToInstructorDTO(user: InstructorUserDoc): InstructorDTO {
    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      isBlocked: user.isBlocked ?? false,
      isApproved: user.isApproved ?? false,
      isRequested: user.isRequested ?? false,
      isRejected: user.isRejected ?? false,
      qualification: user.qualification,
      experience: user.experience,
      aboutMe: user.aboutMe,
      socialMedia: user.socialMedia
        ? {
            linkedin: user.socialMedia.linkedin,
            github: user.socialMedia.github,
          }
        : undefined,
      createdCourses: user.instructorDetails?.createdCourses?.map((courseId) =>
        typeof courseId === 'string' ? courseId : courseId.toString()
      ),
      profit: user.instructorDetails?.profit,
      rating: user.instructorDetails?.rating,
    };
  }
}