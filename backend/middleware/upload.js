import multer from 'multer';
import path from 'path';

// Configure multer for memory storage (files will be stored in memory before uploading to S3)
const storage = multer.memoryStorage();

// File filter function to validate file types
const fileFilter = (req, file, cb) => {
  // Get allowed file types from environment variables
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpeg', 'jpg', 'png', 'webp'];
  
  // Get file extension
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  // Check if file type is allowed
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer with options
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10, // Maximum 10 files per request
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large',
          error: `Maximum file size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 5242880) / 1024 / 1024)}MB`,
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files',
          error: 'Maximum 10 files allowed per request',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field',
          error: 'Invalid file field name',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: error.message,
        });
    }
  }

  if (error.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      error: error.message,
    });
  }

  next(error);
};

// Middleware for single file upload
export const uploadSingle = (fieldName = 'image') => {
  return upload.single(fieldName);
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName = 'images', maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Middleware for mixed file upload (multiple fields)
export const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Validation middleware to check if file was uploaded
export const validateFileUpload = (required = true) => {
  return (req, res, next) => {
    if (required && !req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'File is required',
      });
    }

    // Add file validation
    if (req.file) {
      req.file.isValid = true;
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(file => {
          file.isValid = true;
        });
      } else {
        Object.keys(req.files).forEach(key => {
          req.files[key].forEach(file => {
            file.isValid = true;
          });
        });
      }
    }

    next();
  };
};

// Middleware to validate image dimensions (optional)
export const validateImageDimensions = (minWidth = 100, minHeight = 100, maxWidth = 4000, maxHeight = 4000) => {
  return async (req, res, next) => {
    try {
      const sharp = await import('sharp');
      
      const validateImage = async (file) => {
        try {
          const metadata = await sharp.default(file.buffer).metadata();
          
          if (metadata.width < minWidth || metadata.height < minHeight) {
            throw new Error(`Image too small. Minimum dimensions: ${minWidth}x${minHeight}px`);
          }
          
          if (metadata.width > maxWidth || metadata.height > maxHeight) {
            throw new Error(`Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}px`);
          }
          
          return true;
        } catch (error) {
          throw new Error(`Invalid image file: ${error.message}`);
        }
      };

      if (req.file) {
        await validateImage(req.file);
      }

      if (req.files) {
        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            await validateImage(file);
          }
        } else {
          for (const key of Object.keys(req.files)) {
            for (const file of req.files[key]) {
              await validateImage(file);
            }
          }
        }
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Image validation failed',
        error: error.message,
      });
    }
  };
};

export default upload;