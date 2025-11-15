import express from 'express';
import {
  addActivity,
  getRecentActivities,
  clearOldActivities,
  clearAllActivities,
  getActivityStats,
  runDailyCleanup,
  runWeeklyCleanup,
  getSchedulerStatus
} from '../controllers/activityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add new activity (called when student scans) - Public endpoint for landing page
router.post('/', addActivity);

// Get recent activities for display - Public endpoint for landing page
router.get('/recent', getRecentActivities);

// Get activity statistics
router.get('/stats', authenticateToken, getActivityStats);

// Clear old activities (by hours)
router.delete('/clear-old', authenticateToken, clearOldActivities);

// Clear all activities (end of day cleanup)
router.delete('/clear-all', authenticateToken, clearAllActivities);

// Manual cleanup endpoints
router.post('/cleanup/daily', authenticateToken, runDailyCleanup);
router.post('/cleanup/weekly', authenticateToken, runWeeklyCleanup);

// Scheduler status
router.get('/scheduler/status', authenticateToken, getSchedulerStatus);

export default router;