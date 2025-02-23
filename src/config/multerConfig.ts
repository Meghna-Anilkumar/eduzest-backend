import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinaryConfig";
import { Request, Response, NextFunction } from "express";


const profileImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
    public_id: (req: Request, file: Express.Multer.File) =>
      `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  } as any,
});


const cvStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "instructor_cvs",
    allowed_formats: ["pdf", "doc", "docx"],
    resource_type: "raw",
    public_id: (req: Request, file: Express.Multer.File) =>
      `cv-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  } as any,
});


const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Please upload only images (jpg, jpeg, png, gif)."));
  }
};

const cvFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Please upload only PDF, DOC, or DOCX files."));
  }
};


export const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});


export const uploadInstructorFiles = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.fieldname === "profilePic") {
      imageFileFilter(req, file, cb);
    } else if (file.fieldname === "cv") {
      cvFileFilter(req, file, cb);
    } else {
      cb(new Error("Unexpected field"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "profilePic", maxCount: 1 },
  { name: "cv", maxCount: 1 },
]);


export const handleCloudinaryUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  console.log("Middleware received files:", files);

  if (!files || Object.keys(files).length === 0) {
    return next(new Error("No files uploaded"));
  }

  const uploadPromises: Promise<void>[] = [];

  if (files["profilePic"]?.[0]) {
    const file = files["profilePic"][0];
    console.log("ProfilePic buffer size:", file.buffer?.length || "undefined");
    if (!file.buffer || file.buffer.length === 0) {
      return next(new Error("Profile picture file is empty"));
    }
    uploadPromises.push(
      new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "profile_pictures",
              allowed_formats: ["jpg", "jpeg", "png", "gif"],
              transformation: [{ width: 500, height: 500, crop: "limit" }],
              public_id: `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
            },
            (error, result) => {
              if (error) return reject(error);
              file.path = result?.secure_url || "";
              console.log("ProfilePic uploaded to:", file.path);
              resolve();
            }
          )
          .end(file.buffer);
      })
    );
  }

  if (files["cv"]?.[0]) {
    const file = files["cv"][0];
    console.log("CV buffer size:", file.buffer?.length || "undefined");
    if (!file.buffer || file.buffer.length === 0) {
      return next(new Error("CV file is empty"));
    }
    uploadPromises.push(
      new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "instructor_cvs",
              resource_type: "raw",
              allowed_formats: ["pdf", "doc", "docx"],
              public_id: `cv-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
            },
            (error, result) => {
              if (error) return reject(error);
              file.path = result?.secure_url || "";
              console.log("CV uploaded to:", file.path);
              resolve();
            }
          )
          .end(file.buffer);
      })
    );
  } else {
    return next(new Error("CV is required"));
  }

  Promise.all(uploadPromises)
    .then(() => next())
    .catch((error) => next(error));
};