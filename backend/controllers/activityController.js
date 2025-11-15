import Activity from '../models/Activity.js';
import schedulerService from '../services/schedulerService.js';

// Add a new activity record
export const addActivity = async (req, res) => {
  try {
    const { student_id, student, action } = req.body;

    if (!student_id || !student || !action) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, student data, and action are required'
      });
    }

    if (!['in', 'out'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "in" or "out"'
      });
    }

    const activity = new Activity({
      student_id,
      student,
      action,
      timestamp: new Date()
    });

    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Activity recorded successfully',
      data: activity
    });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record activity',
      error: error.message
    });
  }
};

// Get recent activities
export const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    if (limitNum <= 0 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    const activities = await Activity.getRecent(limitNum);

    res.json({
      success: true,
      data: activities,
      count: activities.length
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
};

// Clear old activities
export const clearOldActivities = async (req, res) => {
  try {
    const { hours = 24 } = req.body;
    const hoursNum = parseInt(hours);

    if (hoursNum <= 0 || hoursNum > 168) { // Max 1 week
      return res.status(400).json({
        success: false,
        message: 'Hours must be between 1 and 168 (1 week)'
      });
    }

    const result = await Activity.clearOld(hoursNum);

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} activities older than ${hoursNum} hours`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing old activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear old activities',
      error: error.message
    });
  }
};

// Clear all activities (end of day cleanup)
export const clearAllActivities = async (req, res) => {
  try {
    const result = await Activity.clearAll();

    res.json({
      success: true,
      message: `Cleared all activities. Deleted ${result.deletedCount} records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing all activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all activities',
      error: error.message
    });
  }
};

// Get activity statistics
export const getActivityStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's activities
    const todayActivities = await Activity.find({
      timestamp: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Count check-ins and check-outs
    const checkIns = todayActivities.filter(activity => activity.action === 'in').length;
    const checkOuts = todayActivities.filter(activity => activity.action === 'out').length;

    // Get total activities count
    const totalCount = await Activity.countDocuments();

    res.json({
      success: true,
      data: {
        today: {
          total: todayActivities.length,
          checkIns,
          checkOuts
        },
        overall: {
          total: totalCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
};

// Manual cleanup endpoints
export const runDailyCleanup = async (req, res) => {
  try {
    const result = await schedulerService.runDailyCleanup();
    res.json({
      success: true,
      message: `Daily cleanup completed. Deleted ${result.deletedCount} activity records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error running daily cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run daily cleanup',
      error: error.message
    });
  }
};

export const runWeeklyCleanup = async (req, res) => {
  try {
    const result = await schedulerService.runWeeklyCleanup();
    res.json({
      success: true,
      message: `Weekly cleanup completed. Deleted ${result.deletedCount} old activity records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error running weekly cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run weekly cleanup',
      error: error.message
    });
  }
};

// Get scheduler status
export const getSchedulerStatus = async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error.message
    });
  }
};