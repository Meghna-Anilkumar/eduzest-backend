import { ICourse } from "../interfaces/ICourse";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { ICourseDTO } from "../interfaces/ICourseDTO";
import { Types } from "mongoose";

dotenv.config();

const s3Config = {
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY!,
    secretAccessKey: process.env.BUCKET_SECRET!,
  },
  region: process.env.BUCKET_REGION!,
};

const s3 = new S3Client(s3Config);

export class S3Service {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = s3;
    this.bucketName = process.env.BUCKET_NAME!;
  }

  // Upload a file to S3
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.s3.send(command);
  }

  // Generate a signed URL for an S3 object
  async getSignedUrl(key: string, expiresIn: number = 3600 * 24 * 7): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await getSignedUrl(this.s3, command, { expiresIn });
  }



  async addSignedUrlsToCourse(course: ICourse): Promise<ICourseDTO> {
    const signedCourse: ICourseDTO = {
      _id: (course._id as unknown as Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail ? await this.getSignedUrl(course.thumbnail) : "",
      instructorRef: course.instructorRef instanceof Types.ObjectId
        ? course.instructorRef.toString()
        : course.instructorRef,
      categoryRef: course.categoryRef instanceof Types.ObjectId
        ? course.categoryRef.toString()
        : course.categoryRef,
      language: course.language,
      level: course.level,
      modules: await Promise.all(
        course.modules.map(async (module) => ({
          moduleTitle: module.moduleTitle,
          lessons: await Promise.all(
            module.lessons.map(async (lesson) => ({
              lessonNumber: lesson.lessonNumber,
              title: lesson.title,
              description: lesson.description,
              video: lesson.video ? await this.getSignedUrl(lesson.video) : "",
              duration: lesson.duration,
              objectives: lesson.objectives,
            }))
          ),
        }))
      ),
      trial: {
        video: course.trial?.video ? await this.getSignedUrl(course.trial.video) : undefined,
      },
      pricing: course.pricing,
      attachments: course.attachments,
      isRequested: course.isRequested,
      isBlocked: course.isBlocked,
      studentsEnrolled: course.studentsEnrolled,
      isPublished: course.isPublished,
      isRejected: course.isRejected,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    return signedCourse;
  }

  async addSignedUrlsToCourses(courses: ICourse[]): Promise<ICourseDTO[]> {
    return await Promise.all(courses.map((course) => this.addSignedUrlsToCourse(course)));
  }
}

export const s3Service = new S3Service();