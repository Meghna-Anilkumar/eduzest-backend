import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();


const s3Client = new S3Client({
    region: process.env.BUCKET_REGION!,
    credentials: {
        accessKeyId: process.env.BUCKET_ACCESS_KEY!,
        secretAccessKey: process.env.BUCKET_SECRET!,
    }
});


export async function uploadToS3(file: Express.Multer.File, fileType: 'profile' | 'document' = 'profile'): Promise<string> {
    if (!file) {
        throw new Error("No file provided");
    }

    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    
    // Different folder paths based on file type
    const key = fileType === 'profile' 
        ? `profile-images/${fileName}` 
        : `documents/${fileName}`;

    const bucketName = process.env.BUCKET_NAME!;
  
    const params = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 * 7 }); 

        return signedUrl;
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("Failed to upload file to S3");
    }

}

export default s3Client;