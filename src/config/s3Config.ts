import dotenv from "dotenv";

dotenv.config(); 

export const s3Config =({
    accessKeyId: process.env.BUCKET_ACCESS_KEY,
    secretAccessKey: process.env.BUCKET_SECRET,
    region: process.env.BUCKET_REGION
});


