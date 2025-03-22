import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export const s3Config = {
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY!,
    secretAccessKey: process.env.BUCKET_SECRET!,
  },
  region: process.env.BUCKET_REGION!,
};

export const s3 = new S3Client(s3Config);