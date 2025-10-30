import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class S3Service {
  constructor() {
    // Validate environment variables
    const requiredEnvVars = {
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('S3Service initialized with:');
    console.log('- Region:', process.env.AWS_REGION);
    console.log('- Bucket:', process.env.AWS_S3_BUCKET_NAME);
    console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
    console.log('- Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  /**
   * Generate a unique filename with timestamp and random string
   */
  generateFileName(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    return `${timestamp}-${randomString}-${baseName}${extension}`;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(fileBuffer, originalName, mimeType, folder = 'uploads') {
    try {
      console.log('uploadFile called with:');
      console.log('- originalName:', originalName);
      console.log('- mimeType:', mimeType);
      console.log('- folder:', folder);
      console.log('- bucketName:', this.bucketName);
      console.log('- fileBuffer size:', fileBuffer?.length);

      if (!this.bucketName) {
        throw new Error('Bucket name is not configured');
      }

      const fileName = this.generateFileName(originalName);
      const key = `${folder}/${fileName}`;

      console.log('Generated key:', key);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          originalName: originalName,
          uploadDate: new Date().toISOString(),
        },
      });

      console.log('Sending command to S3...');
      await this.s3Client.send(command);
      console.log('S3 upload successful');

      return {
        success: true,
        key: key,
        fileName: fileName,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        originalName: originalName,
        size: fileBuffer.length,
        mimeType: mimeType,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadMultipleFiles(files, folder = 'uploads') {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file.buffer, file.originalname, file.mimetype, folder)
      );

      const results = await Promise.all(uploadPromises);
      return {
        success: true,
        files: results,
        count: results.length,
      };
    } catch (error) {
      console.error('Error uploading multiple files to S3:', error);
      throw new Error('Failed to upload files to S3');
    }
  }

  /**
   * Get signed URL for file access (for private files)
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresIn, // URL expires in 1 hour by default
      });

      return {
        success: true,
        url: signedUrl,
        expiresIn: expiresIn,
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      return {
        success: true,
        message: 'File deleted successfully',
        key: key,
      };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteMultipleFiles(keys) {
    try {
      const deletePromises = keys.map(key => this.deleteFile(key));
      const results = await Promise.all(deletePromises);

      return {
        success: true,
        deletedFiles: results,
        count: results.length,
      };
    } catch (error) {
      console.error('Error deleting multiple files from S3:', error);
      throw new Error('Failed to delete files from S3');
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        success: true,
        metadata: {
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          lastModified: response.LastModified,
          etag: response.ETag,
          metadata: response.Metadata,
        },
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }
}

export default new S3Service();