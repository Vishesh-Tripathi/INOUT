import express from 'express';
import {
  getAllLogs,
  getStudentLogs,
  getRecentActivity,
  getTodayStats,
  getStatsByDate,
  clearOldLogs
} from '../controllers/logController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all logs with pagination
router.get('/', getAllLogs);

// Get recent activity
router.get('/recent', getRecentActivity);

// Get today's statistics
router.get('/stats/today', getTodayStats);

// Get statistics by specific date
router.get('/stats/:date', getStatsByDate);

// Get logs for specific student
router.get('/student/:studentId', getStudentLogs);

// Clear old logs (admin only)
router.delete('/cleanup', requireRole(['admin']), clearOldLogs);

export default router;