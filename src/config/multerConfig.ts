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


// Configure multer for course creation (thumbnail and multiple videos)
export const uploadCourseFiles = multer({
  storage: s3Storage,
  limits: {
    fileSize: 100 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Thumbnail must be an image file!') as any, false);
    }
    if (file.fieldname === 'videos' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed for lessons!') as any, false);
    }
    cb(null, true);
  },
}).fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'videos', maxCount: 50 },
]);