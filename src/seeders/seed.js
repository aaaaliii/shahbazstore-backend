import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import seedUsers from './userSeeder.js';
import seedCategories from './categorySeeder.js';
import seedProducts from './productSeeder.js';
import seedReviews from './reviewSeeder.js';
import seedDiscountCodes from './discountCodeSeeder.js';

dotenv.config();

const runSeeders = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to database
    await connectDB();
    console.log('Connected to database\n');

    // Run seeders in order (dependencies first)
    console.log('📦 Seeding Users...');
    await seedUsers();
    console.log('');

    console.log('📦 Seeding Categories...');
    const categories = await seedCategories();
    console.log('');

    console.log('📦 Seeding Products...');
    const products = await seedProducts();
    console.log('');

    console.log('📦 Seeding Reviews...');
    await seedReviews();
    console.log('');

    console.log('📦 Seeding Discount Codes...');
    await seedDiscountCodes();
    console.log('');

    console.log('✅ All seeders completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: Seeded`);
    console.log(`   - Categories: ${categories?.length || 0}`);
    console.log(`   - Products: ${products?.length || 0}`);
    console.log(`   - Reviews: Seeded`);
    console.log(`   - Discount Codes: Seeded`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  }
};

runSeeders();
