import Log from '../models/Log.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getAllLogs = asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  const logs = await Log.find({})
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset));
  
  res.json({
    success: true,
    data: {
      logs,
      count: logs.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }
  });
});

export const getStudentLogs = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 50 } = req.query;
  
  const logs = await Log.getByStudentId(studentId, parseInt(limit));
  
  res.json({
    success: true,
    data: {
      logs,
      count: logs.length,
      studentId
    }
  });
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const { hours = 24 } = req.query;
  
  const logs = await Log.getRecentActivity(parseInt(hours));
  
  res.json({
    success: true,
    data: {
      logs,
      count: logs.length,
      timeframe: `${hours} hours`
    }
  });
});

export const getTodayStats = asyncHandler(async (req, res) => {
  const stats = await Log.getTodayStats();
  
  res.json({
    success: true,
    data: {
      stats
    }
  });
});

export const getStatsByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      success: false,
      message: 'Date must be in YYYY-MM-DD format'
    });
  }
  
  const stats = await Log.getStatsByDate(date);
  
  res.json({
    success: true,
    data: {
      stats
    }
  });
});

export const clearOldLogs = asyncHandler(async (req, res) => {
  const { days = 30 } = req.body;
  
  const result = await Log.clearOldLogs(parseInt(days));
  
  res.json({
    success: true,
    message: `Cleared logs older than ${days} days`,
    data: {
      deletedCount: result.deletedCount
    }
  });
});