import mongoose from 'mongoose';

class Database {
  constructor() {
    this.isConnected = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  async connect() {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inout_system';
      
      await mongoose.connect(mongoURI, {
        // These options are for MongoDB driver 4.0+
        maxPoolSize: 10, // Maximum number of connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      });

      console.log(`🗃️ Connected to MongoDB: ${mongoURI}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  async initialize() {
    if (!this.isConnected) {
      await this.connect();
    }
    
    // Create default admin user if none exists
    await this.createDefaultAdmin();
    
    console.log('✅ Database initialization completed');
  }

  async createDefaultAdmin() {
    try {
      // Import User model here to avoid circular dependency
      const { default: User } = await import('./User.js');
      
      // Check if any admin user exists
      const adminCount = await User.countDocuments({ role: 'admin' });
      
      if (adminCount === 0) {
        // Create default admin user - password will be hashed by User model pre-save middleware
        await User.create({
          username: 'admin',
          email: 'admin@inout.com',
          password: 'admin123',
          role: 'admin'
        });

        console.log('🔐 Default admin user created:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   ⚠️  Please change the default password after first login!');
      }
    } catch (error) {
      console.error('❌ Error creating default admin:', error);
    }
  }

  async gracefulShutdown(signal) {
    console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);
    
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  async close() {
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  getConnection() {
    return mongoose.connection;
  }

  isConnectionReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

// Create and export a singleton instance
const database = new Database();

export default database;