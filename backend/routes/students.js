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

// All routes require authentication
router.use(authenticateToken);

// Get all students
router.get('/', getAllStudents);

// Get students by status (in/out)
router.get('/status/:status', getStudentsByStatus);

// Get specific student
router.get('/:studentId', getStudent);

// Create single student
router.post('/', requireRole(['admin']), createStudent);

// Create multiple students (bulk import)
router.post('/bulk', requireRole(['admin']), createMultipleStudents);

// Update student
router.put('/:studentId', requireRole(['admin']), updateStudent);

// Delete student
router.delete('/:studentId', requireRole(['admin']), deleteStudent);

// Toggle student status (for scanning)
router.patch('/:studentId/toggle', toggleStudentStatus);

export default router;