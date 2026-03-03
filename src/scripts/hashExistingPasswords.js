import User from '../models/User.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const hashExistingPasswords = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get all users
    const users = await User.find({}).select('+password');
    console.log(`Found ${users.length} users`);

    let updatedCount = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      const isHashed = user.password && (
        user.password.startsWith('$2a$') ||
        user.password.startsWith('$2b$') ||
        user.password.startsWith('$2y$')
      );

      if (!isHashed) {
        console.log(`Hashing password for user: ${user.email}`);
        user.password = await bcrypt.hash(user.password, 10);
        await user.save();
        updatedCount++;
      }
    }

    console.log(`✅ Successfully hashed ${updatedCount} passwords`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error hashing passwords:', error);
    process.exit(1);
  }
};

hashExistingPasswords();
