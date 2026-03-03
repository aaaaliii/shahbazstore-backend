import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Check if already connected (important for serverless/function reuse)
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Serverless-friendly options
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't exit process in serverless environment - let the function handle the error
    // process.exit(1) would kill the serverless function
    throw error;
  }
};

export default connectDB;
