import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  action: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours (1 day)
  }
}, {
  timestamps: true
});

// Index for efficient queries
activitySchema.index({ timestamp: -1 });
activitySchema.index({ createdAt: 1 });

// Static method to get recent activities
activitySchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method to clear activities older than specified hours
activitySchema.statics.clearOld = function(hours = 24) {
  const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
  return this.deleteMany({ timestamp: { $lt: cutoffTime } });
};

// Static method to clear all activities (for end of day cleanup)
activitySchema.statics.clearAll = function() {
  return this.deleteMany({});
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;