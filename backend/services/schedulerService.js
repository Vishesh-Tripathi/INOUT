import cron from 'node-cron';
import Activity from '../models/Activity.js';

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.initialize();
  }

  initialize() {
    console.log('🕒 Initializing scheduled tasks...');
    
    // Schedule daily cleanup at midnight (00:00)
    this.scheduleActivityCleanup();
    
    // Schedule weekly cleanup on Sunday at 2 AM (more thorough cleanup)
    this.scheduleWeeklyCleanup();
  }

  scheduleActivityCleanup() {
    // Run every day at midnight (00:00)
    const dailyCleanup = cron.schedule('0 0 * * *', async () => {
      try {
        console.log('🧹 Running daily activity cleanup...');
        const result = await Activity.clearAll();
        console.log(`✅ Daily cleanup completed. Deleted ${result.deletedCount} activity records.`);
      } catch (error) {
        console.error('❌ Error during daily activity cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // Adjust timezone as needed
    });

    this.jobs.push({ name: 'daily-activity-cleanup', job: dailyCleanup });
    console.log('📅 Daily activity cleanup scheduled for midnight');
  }

  scheduleWeeklyCleanup() {
    // Run every Sunday at 2:00 AM
    const weeklyCleanup = cron.schedule('0 2 * * 0', async () => {
      try {
        console.log('🧹 Running weekly activity cleanup...');
        
        // Clear all activities older than 7 days (as a safety measure)
        const result = await Activity.clearOld(168); // 168 hours = 7 days
        
        console.log(`✅ Weekly cleanup completed. Deleted ${result.deletedCount} old activity records.`);
      } catch (error) {
        console.error('❌ Error during weekly activity cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // Adjust timezone as needed
    });

    this.jobs.push({ name: 'weekly-activity-cleanup', job: weeklyCleanup });
    console.log('📅 Weekly activity cleanup scheduled for Sunday 2 AM');
  }

  // Manual cleanup methods (for API endpoints)
  async runDailyCleanup() {
    try {
      console.log('🧹 Running manual daily cleanup...');
      const result = await Activity.clearAll();
      console.log(`✅ Manual daily cleanup completed. Deleted ${result.deletedCount} activity records.`);
      return result;
    } catch (error) {
      console.error('❌ Error during manual daily cleanup:', error);
      throw error;
    }
  }

  async runWeeklyCleanup() {
    try {
      console.log('🧹 Running manual weekly cleanup...');
      const result = await Activity.clearOld(168); // 7 days
      console.log(`✅ Manual weekly cleanup completed. Deleted ${result.deletedCount} old activity records.`);
      return result;
    } catch (error) {
      console.error('❌ Error during manual weekly cleanup:', error);
      throw error;
    }
  }

  // Get scheduler status
  getStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running,
      scheduled: job.scheduled,
      lastDate: job.lastDate,
      nextDate: job.nextDate()
    }));
  }

  // Stop all scheduled jobs
  stopAll() {
    console.log('⏹️ Stopping all scheduled tasks...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`⏹️ Stopped: ${name}`);
    });
  }

  // Start all scheduled jobs
  startAll() {
    console.log('▶️ Starting all scheduled tasks...');
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`▶️ Started: ${name}`);
    });
  }
}

// Create and export singleton instance
const schedulerService = new SchedulerService();

export default schedulerService;