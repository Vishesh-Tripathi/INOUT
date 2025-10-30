import express from 'express';
import s3Service from '../services/s3Service.js';
import { 
  uploadSingle, 
  uploadMultiple, 
  handleMulterError, 
  validateFileUpload 
} from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Upload single image
 * POST /api/upload/image
 */
router.post('/image', 
  authenticateToken,
  uploadSingle('image'),
  handleMulterError,
  validateFileUpload(true),
  async (req, res) => {
    try {
      const { file } = req;
      const { folder = 'images' } = req.body;

      // Upload to S3
      const result = await s3Service.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder
      );

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          file: result,
          uploadedBy: req.user.id,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message,
      });
    }
  }
);

/**
 * Upload multiple images
 * POST /api/upload/images
 */
router.post('/images',
  authenticateToken,
  uploadMultiple('images', 5), // Maximum 5 images
  handleMulterError,
  validateFileUpload(true),
  async (req, res) => {
    try {
      const { files } = req;
      const { folder = 'images' } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      // Upload all files to S3
      const result = await s3Service.uploadMultipleFiles(files, folder);

      res.status(201).json({
        success: true,
        message: `${result.count} images uploaded successfully`,
        data: {
          files: result.files,
          count: result.count,
          uploadedBy: req.user.id,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images',
        error: error.message,
      });
    }
  }
);

/**
 * Upload student profile image
 * POST /api/upload/student/:studentId/profile
 */
router.post('/student/:studentId/profile',
  authenticateToken,
  uploadSingle('profileImage'),
  handleMulterError,
  validateFileUpload(true),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { file } = req;

      // Upload to S3 in student-profiles folder
      const result = await s3Service.uploadFile(
        file.buffer,
        `${studentId}_${file.originalname}`,
        file.mimetype,
        'student-profiles'
      );

      res.status(201).json({
        success: true,
        message: 'Student profile image uploaded successfully',
        data: {
          studentId,
          file: result,
          uploadedBy: req.user.id,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload student profile image',
        error: error.message,
      });
    }
  }
);

/**
 * Get signed URL for private file access
 * GET /api/upload/signed-url
 */
router.get('/signed-url',
  authenticateToken,
  async (req, res) => {
    try {
      const { key, expiresIn = 3600 } = req.query;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'File key is required',
        });
      }

      // Check if file exists
      const fileExists = await s3Service.fileExists(key);
      if (!fileExists) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      // Generate signed URL
      const result = await s3Service.getSignedUrl(key, parseInt(expiresIn));

      res.json({
        success: true,
        message: 'Signed URL generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Signed URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate signed URL',
        error: error.message,
      });
    }
  }
);

/**
 * Delete file from S3
 * DELETE /api/upload/file
 */
router.delete('/file',
  authenticateToken,
  async (req, res) => {
    try {
      const { key } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'File key is required',
        });
      }

      // Check if file exists
      const fileExists = await s3Service.fileExists(key);
      if (!fileExists) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      // Delete file
      const result = await s3Service.deleteFile(key);

      res.json({
        success: true,
        message: 'File deleted successfully',
        data: {
          ...result,
          deletedBy: req.user.id,
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error.message,
      });
    }
  }
);

/**
 * Delete multiple files from S3
 * DELETE /api/upload/files
 */
router.delete('/files',
  authenticateToken,
  async (req, res) => {
    try {
      const { keys } = req.body;

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File keys array is required',
        });
      }

      // Delete files
      const result = await s3Service.deleteMultipleFiles(keys);

      res.json({
        success: true,
        message: `${result.count} files deleted successfully`,
        data: {
          ...result,
          deletedBy: req.user.id,
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete files',
        error: error.message,
      });
    }
  }
);

/**
 * Get file metadata
 * GET /api/upload/metadata
 */
router.get('/metadata',
  authenticateToken,
  async (req, res) => {
    try {
      const { key } = req.query;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'File key is required',
        });
      }

      // Get file metadata
      const result = await s3Service.getFileMetadata(key);

      res.json({
        success: true,
        message: 'File metadata retrieved successfully',
        data: result.metadata,
      });
    } catch (error) {
      console.error('Metadata error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get file metadata',
        error: error.message,
      });
    }
  }
);

/**
 * Health check for upload service
 * GET /api/upload/health
 */
router.get('/health', async (req, res) => {
  try {
    // Check AWS credentials and bucket access
    const isHealthy = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME &&
      process.env.AWS_REGION
    );

    res.json({
      success: true,
      message: 'Upload service health check',
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        awsConfigured: isHealthy,
        maxFileSize: process.env.MAX_FILE_SIZE || '5242880',
        allowedTypes: process.env.ALLOWED_FILE_TYPES || 'jpeg,jpg,png,webp',
        bucket: process.env.AWS_S3_BUCKET_NAME,
        region: process.env.AWS_REGION,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Upload service health check failed',
      error: error.message,
    });
  }
});

export default router;