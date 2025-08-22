import { StudentDTO, InstructorDTO } from '../interfaces/IDTO';

export class DTOMapper {
  // Map UserDoc to StudentDTO
  static mapToStudentDTO(user: any): StudentDTO {
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
      enrolledCourses: user.studentDetails?.enrolledCourses?.map((course: any) => ({
        courseId: course.courseId.toString(),
        progress: course.progress,
        rating: course.rating,
      })),
    };
  }

  // Map UserDoc to InstructorDTO
  static mapToInstructorDTO(user: any): InstructorDTO {
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
      createdCourses: user.instructorDetails?.createdCourses?.map((courseId: any) =>
        courseId.toString()
      ),
      profit: user.instructorDetails?.profit,
      rating: user.instructorDetails?.rating,
    };
  }
}