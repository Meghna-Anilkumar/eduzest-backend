import multer from 'multer';


const s3Storage = multer.memoryStorage();

// Configure multer for S3 uploads (single file)
export const uploadToS3Single = multer({
  storage: s3Storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!') as any, false);
    }
  }
});

// Configure multer for S3 uploads (multiple files)
export const uploadToS3Multiple = multer({
  storage: s3Storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
]);

