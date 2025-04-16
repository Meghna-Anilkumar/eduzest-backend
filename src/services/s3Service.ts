import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import dotenv from "dotenv";
import { ICourse } from "../interfaces/ICourse";
import { ICourseDTO } from "../interfaces/ICourseDTO";
import { Types } from "mongoose";

dotenv.config();

export class S3Service {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.BUCKET_ACCESS_KEY!,
        secretAccessKey: process.env.BUCKET_SECRET!,
      },
      region: process.env.BUCKET_REGION!,
    });
    this.bucketName = process.env.BUCKET_NAME!;
  }

  async getObject(
    key: string,
    metadataOnly: boolean = false,
    range?: string
  ): Promise<{
    Body?: Readable;
    ContentType?: string;
    ContentLength?: number;
  }> {
    try {
      console.log(`Attempting to get object with key: ${key}, metadataOnly: ${metadataOnly}, range: ${range}`);
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Range: range, // Only include Range if specified, avoid other implicit operations
      });
      const response = await this.s3.send(command);

      let body: Readable | undefined;
      if (!metadataOnly && response.Body instanceof Readable) {
        body = response.Body as Readable;
      } else if (!metadataOnly && response.Body) {
        throw new Error("S3 response Body is not a Readable stream");
      }

      console.log(`S3 getObject response for key ${key}:`, {
        ContentType: response.ContentType,
        ContentLength: response.ContentLength,
      });

      return {
        Body: body,
        ContentType: response.ContentType,
        ContentLength: response.ContentLength || undefined, // Ensure ContentLength is optional
      };
    } catch (error) {
      console.error(`Error fetching S3 object for key ${key}:`, error);
      throw error;
    }
  }

  async uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.s3.send(command);
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3.send(command);
    console.log(`S3 object deleted for key ${key}`);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
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
      thumbnailKey: course.thumbnail,
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
          _id: (module._id as unknown as Types.ObjectId).toString(),
          moduleTitle: module.moduleTitle,
          lessons: await Promise.all(
            module.lessons.map(async (lesson) => ({
              _id: (lesson._id as unknown as Types.ObjectId).toString(),
              lessonNumber: lesson.lessonNumber,
              title: lesson.title,
              description: lesson.description,
              videoKey: lesson.video || "",
              duration: lesson.duration,
              objectives: lesson.objectives,
            }))
          ),
        }))
      ),
      trial: {
        video: course.trial?.video ? await this.getSignedUrl(course.trial.video, 3600) : undefined,
        videoKey: course.trial?.video,
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