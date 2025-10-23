import express from 'express';
import {
  getAllStudents,
  getStudent,
  createStudent,
  createMultipleStudents,
  updateStudent,
  deleteStudent,
  getStudentsByStatus,
  toggleStudentStatus
} from '../controllers/studentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required for scanner functionality)
// Get all students - needed for scanner to work
router.get('/', getAllStudents);

// Toggle student status (for scanning) - public access for scanner
router.patch('/:studentId/toggle', toggleStudentStatus);

// Protected routes (require authentication)
// Get students by status (in/out) - admin only
router.get('/status/:status', authenticateToken, getStudentsByStatus);

// Get specific student - admin only
router.get('/:studentId', authenticateToken, getStudent);

// Create single student - admin only
router.post('/', authenticateToken, requireRole(['admin']), createStudent);

// Create multiple students (bulk import) - admin only
router.post('/bulk', authenticateToken, requireRole(['admin']), createMultipleStudents);

// Update student - admin only
router.put('/:studentId', authenticateToken, requireRole(['admin']), updateStudent);

// Delete student - admin only
router.delete('/:studentId', authenticateToken, requireRole(['admin']), deleteStudent);

export default router;