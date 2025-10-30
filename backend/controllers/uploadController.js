import s3Service from '../services/s3Service.js';
import Student from '../models/Student.js';

/**
 * Upload student profile image and update student record
 */
export const uploadStudentProfileImage = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { file } = req;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Delete old profile image if exists
    if (student.profileImage && student.profileImage.key) {
      try {
        await s3Service.deleteFile(student.profileImage.key);
      } catch (error) {
        console.warn('Failed to delete old profile image:', error.message);
      }
    }

    // Upload new image to S3
    const uploadResult = await s3Service.uploadFile(
      file.buffer,
      `${studentId}_profile_${file.originalname}`,
      file.mimetype,
      'student-profiles'
    );

    // Update student record with new image info
    student.profileImage = {
      url: uploadResult.url,
      key: uploadResult.key,
      fileName: uploadResult.fileName,
      originalName: uploadResult.originalName,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
    };

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student profile image uploaded successfully',
      data: {
        student: {
          id: student._id,
          name: student.name,
          enrollmentNumber: student.enrollmentNumber,
          profileImage: student.profileImage,
        },
        uploadDetails: uploadResult,
      },
    });
  } catch (error) {
    console.error('Error uploading student profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload student profile image',
      error: error.message,
    });
  }
};

/**
 * Upload student document (ID card, etc.)
 */
export const uploadStudentDocument = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { file } = req;
    const { documentType = 'general' } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided',
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Upload document to S3
    const uploadResult = await s3Service.uploadFile(
      file.buffer,
      `${studentId}_${documentType}_${file.originalname}`,
      file.mimetype,
      'student-documents'
    );

    // Add document to student record
    if (!student.documents) {
      student.documents = [];
    }

    student.documents.push({
      type: documentType,
      url: uploadResult.url,
      key: uploadResult.key,
      fileName: uploadResult.fileName,
      originalName: uploadResult.originalName,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
    });

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student document uploaded successfully',
      data: {
        student: {
          id: student._id,
          name: student.name,
          enrollmentNumber: student.enrollmentNumber,
          documentsCount: student.documents.length,
        },
        document: uploadResult,
        documentType,
      },
    });
  } catch (error) {
    console.error('Error uploading student document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload student document',
      error: error.message,
    });
  }
};

/**
 * Delete student profile image
 */
export const deleteStudentProfileImage = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (!student.profileImage || !student.profileImage.key) {
      return res.status(404).json({
        success: false,
        message: 'No profile image found for this student',
      });
    }

    // Delete image from S3
    await s3Service.deleteFile(student.profileImage.key);

    // Remove profile image from student record
    student.profileImage = undefined;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student profile image deleted successfully',
      data: {
        studentId: student._id,
        deletedBy: req.user.id,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error deleting student profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student profile image',
      error: error.message,
    });
  }
};

/**
 * Delete student document
 */
export const deleteStudentDocument = async (req, res) => {
  try {
    const { studentId, documentId } = req.params;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Find document
    const documentIndex = student.documents.findIndex(
      doc => doc._id.toString() === documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const document = student.documents[documentIndex];

    // Delete document from S3
    await s3Service.deleteFile(document.key);

    // Remove document from student record
    student.documents.splice(documentIndex, 1);
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student document deleted successfully',
      data: {
        studentId: student._id,
        documentId,
        deletedBy: req.user.id,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error deleting student document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student document',
      error: error.message,
    });
  }
};

/**
 * Get student images and documents
 */
export const getStudentMedia = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student media retrieved successfully',
      data: {
        student: {
          id: student._id,
          name: student.name,
          enrollmentNumber: student.enrollmentNumber,
        },
        profileImage: student.profileImage || null,
        documents: student.documents || [],
        totalDocuments: student.documents ? student.documents.length : 0,
      },
    });
  } catch (error) {
    console.error('Error getting student media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student media',
      error: error.message,
    });
  }
};

/**
 * Bulk upload student photos from CSV with enrollment numbers
 */
export const bulkUploadStudentPhotos = async (req, res) => {
  try {
    const { files } = req;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        // Extract enrollment number from filename (assuming format: enrollmentNumber_name.ext)
        const enrollmentNumber = file.originalname.split('_')[0];
        
        // Find student by enrollment number
        const student = await Student.findOne({ enrollmentNumber });
        
        if (!student) {
          errors.push({
            file: file.originalname,
            error: `Student with enrollment number ${enrollmentNumber} not found`,
          });
          continue;
        }

        // Delete old profile image if exists
        if (student.profileImage && student.profileImage.key) {
          try {
            await s3Service.deleteFile(student.profileImage.key);
          } catch (error) {
            console.warn('Failed to delete old profile image:', error.message);
          }
        }

        // Upload new image
        const uploadResult = await s3Service.uploadFile(
          file.buffer,
          `${student._id}_profile_${file.originalname}`,
          file.mimetype,
          'student-profiles'
        );

        // Update student record
        student.profileImage = {
          url: uploadResult.url,
          key: uploadResult.key,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
        };

        await student.save();

        uploadResults.push({
          studentId: student._id,
          enrollmentNumber: student.enrollmentNumber,
          name: student.name,
          fileName: file.originalname,
          uploadResult,
        });
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${uploadResults.length} photos uploaded successfully`,
      data: {
        successful: uploadResults,
        errors: errors,
        totalFiles: files.length,
        successCount: uploadResults.length,
        errorCount: errors.length,
      },
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk upload',
      error: error.message,
    });
  }
};