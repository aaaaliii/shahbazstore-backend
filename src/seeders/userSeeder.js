import User from '../models/User.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const users = [
  {
    name: 'Admin User',
    email: 'admin@shahbazstore.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1234567890',
    address: {
      street: '123 Admin Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567891',
    address: {
      street: '456 Main Street',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567892',
    address: {
      street: '789 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567893',
    address: {
      street: '321 Pine Road',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567894',
    address: {
      street: '654 Elm Street',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567895',
    isActive: true
  },
  {
    name: 'Diana Prince',
    email: 'diana.prince@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567896',
    address: {
      street: '987 Maple Drive',
      city: 'Philadelphia',
      state: 'PA',
      zipCode: '19101',
      country: 'USA'
    },
    isActive: true
  },
  {
    name: 'Inactive User',
    email: 'inactive@example.com',
    password: 'password123',
    role: 'customer',
    phone: '+1234567897',
    isActive: false
  }
];

const seedUsers = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing users (optional - comment out if you want to keep existing users)
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Hash passwords before inserting
    const usersWithHashedPasswords = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return {
          ...user,
          password: hashedPassword
        };
      })
    );

    // Insert users with hashed passwords
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Seeded ${createdUsers.length} users successfully`);

    // Display created users
    createdUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    return createdUsers;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

export default seedUsers;
