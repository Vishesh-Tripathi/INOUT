import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: [true, 'Student ID is required'],
    trim: true,
    uppercase: true,
    ref: 'Student' // Reference to Student model
  },
  student_name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: ['in', 'out']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We're using our own timestamp field
});

// Indexes for better performance
logSchema.index({ student_id: 1 });
logSchema.index({ timestamp: -1 });
logSchema.index({ action: 1 });
logSchema.index({ department: 1 });
logSchema.index({ student_id: 1, timestamp: -1 });

// Static methods
logSchema.statics.getRecentActivity = function(hours = 24) {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ timestamp: { $gte: hoursAgo } })
    .sort({ timestamp: -1 });
};

logSchema.statics.getByStudentId = function(studentId, limit = 50) {
  return this.find({ student_id: studentId.toUpperCase() })
    .sort({ timestamp: -1 })
    .limit(limit);
};

logSchema.statics.getTodayStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = await this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: today,
          $lt: tomorrow
        }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = { in: 0, out: 0, date: today.toISOString().split('T')[0] };
  stats.forEach(stat => {
    result[stat._id] = stat.count;
  });

  return result;
};

logSchema.statics.getStatsByDate = async function(date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const stats = await this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: targetDate,
          $lt: nextDay
        }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = { in: 0, out: 0, date: date };
  stats.forEach(stat => {
    result[stat._id] = stat.count;
  });

  return result;
};

logSchema.statics.clearOldLogs = function(daysToKeep = 30) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  return this.deleteMany({ timestamp: { $lt: cutoffDate } });
};

logSchema.statics.createLogEntry = async function(studentData, action) {
  return this.create({
    student_id: studentData.student_id,
    student_name: studentData.name,
    department: studentData.department,
    action: action,
    timestamp: new Date()
  });
};

// Get department-wise stats
logSchema.statics.getDepartmentStats = async function(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: {
          department: '$department',
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.department',
        stats: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Pre-save middleware
logSchema.pre('save', function(next) {
  // Ensure student_id is uppercase
  if (this.student_id) {
    this.student_id = this.student_id.toUpperCase();
  }
  next();
});

const Log = mongoose.model('Log', logSchema);

export default Log;