import Category from '../models/Category.js';

const categories = [
  {
    name: 'Kitchen',
    description: 'Kitchen essentials and appliances',
    isActive: true,
    order: 1
  },
  {
    name: 'Dining',
    description: 'Dining room furniture and accessories',
    isActive: true,
    order: 2
  },
  {
    name: 'Bedroom',
    description: 'Bedroom furniture and decor',
    isActive: true,
    order: 3
  },
  {
    name: 'Living',
    description: 'Living room furniture and accessories',
    isActive: true,
    order: 4
  },
  {
    name: 'Office',
    description: 'Office furniture and supplies',
    isActive: true,
    order: 5
  },
  {
    name: 'Outdoor',
    description: 'Outdoor furniture and garden items',
    isActive: true,
    order: 6
  }
];

const seedCategories = async () => {
  try {
    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Generate slugs manually (since insertMany doesn't trigger pre-save hooks)
    const categoriesWithSlugs = categories.map(cat => ({
      ...cat,
      slug: cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }));

    // Insert categories one by one to ensure pre-save hooks work, or use insertMany with pre-generated slugs
    const createdCategories = await Category.insertMany(categoriesWithSlugs);
    console.log(`✅ Seeded ${createdCategories.length} categories successfully`);

    // Display created categories
    createdCategories.forEach(category => {
      console.log(`  - ${category.name} (${category.slug})`);
    });

    return createdCategories;
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
};

export default seedCategories;
