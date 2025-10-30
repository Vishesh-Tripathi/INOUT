import express from 'express';
import {
  getAllStudents,
  getStudent,
  createStudent,
  createMultipleStudents,
  updateStudent,
  deleteStudent,
  getStudentsByStatus,
  getStudentsBySemester,
  getStudentsByLocation,
  toggleStudentStatus,
  uploadStudentImage,
  deleteStudentImage,
  bulkUploadStudentImages
} from '../controllers/studentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleMulterError, validateFileUpload } from '../middleware/upload.js';

const router = express.Router();

// Public routes (no authentication required for scanner functionality)
// Get all students - needed for scanner to work
router.get('/', getAllStudents);

// Toggle student status (for scanning) - public access for scanner
router.patch('/:studentId/toggle', toggleStudentStatus);

// Protected routes (require authentication)
// Get students by status (in/out) - admin only
router.get('/status/:status', authenticateToken, getStudentsByStatus);

// Get students by semester - admin only
router.get('/semester/:semester', authenticateToken, getStudentsBySemester);

// Get students by location (city/state) - admin only
router.get('/location', authenticateToken, getStudentsByLocation);

// Get specific student - admin only
router.get('/:studentId', authenticateToken, getStudent);

// Create single student - admin only (with optional image upload)
router.post('/', 
  authenticateToken, 
  requireRole(['admin']), 
  uploadSingle('image'),
  handleMulterError,
  createStudent
);

// Create multiple students (bulk import) - admin only
router.post('/bulk', authenticateToken, requireRole(['admin']), createMultipleStudents);

// Upload multiple student images based on filename (studentId_name.ext)
router.post('/bulk-images', 
  authenticateToken, 
  requireRole(['admin']), 
  uploadMultiple('images', 50), // Allow up to 50 images
  handleMulterError,
  validateFileUpload(true),
  bulkUploadStudentImages
);

// Update student - admin only (with optional image upload)
router.put('/:studentId', 
  authenticateToken, 
  requireRole(['admin']), 
  uploadSingle('image'),
  handleMulterError,
  updateStudent
);

// Upload/Update student image separately
router.post('/:studentId/image', 
  authenticateToken, 
  requireRole(['admin']), 
  uploadSingle('image'),
  handleMulterError,
  validateFileUpload(true),
  uploadStudentImage
);

// Delete student image
router.delete('/:studentId/image', 
  authenticateToken, 
  requireRole(['admin']), 
  deleteStudentImage
);

// Delete student - admin only
router.delete('/:studentId', authenticateToken, requireRole(['admin']), deleteStudent);

export default router;