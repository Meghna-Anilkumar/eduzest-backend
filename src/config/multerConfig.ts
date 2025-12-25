import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const s3Storage = multer.memoryStorage();

/* ----------------------------------
   Single Image Upload (Profile / ID)
----------------------------------- */
export const uploadToS3Single = multer({
  storage: s3Storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

/* ----------------------------------
   Multiple Files Upload (Profile Pic + CV)
----------------------------------- */
export const uploadToS3Multiple = multer({
  storage: s3Storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
]);

/* ----------------------------------
   Course Upload (Thumbnail + Videos)
----------------------------------- */
export const uploadCourseFiles = multer({
  storage: s3Storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (file.fieldname === 'thumbnail') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Thumbnail must be an image file!'));
      }
    }

    if (file.fieldname === 'videos') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed for lessons!'));
      }
    }

    cb(null, true);
  },
}).fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'videos', maxCount: 50 },
]);
