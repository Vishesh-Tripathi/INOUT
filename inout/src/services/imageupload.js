// Image Upload Service for AWS S3 integration
import api from './api.js';

class ImageUploadService {
  /**
   * Upload a single image
   */
  async uploadImage(file, folder = 'images') {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);

      const response = await api.post('/upload/image', formData);

      return response;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files, folder = 'images') {
    try {
      const formData = new FormData();
      
      // Append all files
      files.forEach((file) => {
        formData.append('images', file);
      });
      
      formData.append('folder', folder);

      const response = await api.post('/upload/images', formData);

      return response;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload images');
    }
  }

  /**
   * Upload student profile image
   */
  async uploadStudentProfile(studentId, file) {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await api.post(`/upload/student/${studentId}/profile`, formData);

      return response;
    } catch (error) {
      console.error('Error uploading student profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload student profile image');
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const params = new URLSearchParams({ key, expiresIn });
      const response = await api.get(`/upload/signed-url?${params.toString()}`);

      return response;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw new Error(error.response?.data?.message || 'Failed to get signed URL');
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(key) {
    try {
      const response = await api.delete('/upload/file', { key });

      return response;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete file');
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(keys) {
    try {
      const response = await api.delete('/upload/files', { keys });

      return response;
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete files');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key) {
    try {
      const params = new URLSearchParams({ key });
      const response = await api.get(`/upload/metadata?${params.toString()}`);

      return response;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(error.response?.data?.message || 'Failed to get file metadata');
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file, maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']) {
    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return true;
  }

  /**
   * Preview image before upload
   */
  previewImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image before upload (optional)
   */
  async compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload with progress tracking
   */
  async uploadWithProgress(file, onProgress, folder = 'images') {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);

      // Note: Progress tracking with fetch API requires additional setup
      // For now, we'll use the regular upload method
      const response = await api.post('/upload/image', formData);

      return response;
    } catch (error) {
      console.error('Error uploading image with progress:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  }

  /**
   * Check upload service health
   */
  async checkHealth() {
    try {
      const response = await api.get('/upload/health');
      return response;
    } catch (error) {
      console.error('Error checking upload service health:', error);
      throw new Error(error.response?.data?.message || 'Upload service unavailable');
    }
  }
}

export default new ImageUploadService();