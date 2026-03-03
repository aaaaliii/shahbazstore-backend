import Product from '../models/Product.js';
import Category from '../models/Category.js';

const seedProducts = async () => {
  try {
    // Get categories
    const categories = await Category.find();
    if (categories.length === 0) {
      throw new Error('No categories found. Please seed categories first.');
    }

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    const products = [
      {
        name: 'Kitchen Wooden Chair',
        description: 'Beautiful handcrafted wooden chair perfect for your kitchen. Made from high-quality oak wood with a smooth finish. Comfortable and durable design that complements any kitchen decor.',
        shortDescription: 'Handcrafted oak wooden chair for kitchen',
        price: 49.0,
        compareAtPrice: 59.0,
        category: categoryMap['kitchen'],
        images: [
          '/assets/images/products/product-2.jpg'
        ],
        stock: 25,
        trackInventory: true,
        featured: true,
        tags: ['wooden', 'chair', 'kitchen', 'furniture'],
        variants: {
          'Color': [
            { name: 'Color', value: 'Brown', priceModifier: 0, stock: 15, sku: 'KWC-BRN' },
            { name: 'Color', value: 'Black', priceModifier: 5, stock: 10, sku: 'KWC-BLK' }
          ]
        }
      },
      {
        name: 'Sieve',
        description: 'High-quality stainless steel kitchen sieve. Perfect for sifting flour, straining liquids, and food preparation. Easy to clean and dishwasher safe.',
        shortDescription: 'Stainless steel kitchen sieve',
        price: 12.99,
        compareAtPrice: 15.99,
        category: categoryMap['kitchen'],
        images: [
          '/assets/images/products/product-3.jpg'
        ],
        stock: 50,
        trackInventory: true,
        featured: true,
        tags: ['sieve', 'kitchen', 'utensil', 'stainless steel']
      },
      {
        name: 'Blue Pillow',
        description: 'Soft and comfortable decorative pillow in beautiful blue color. Made from premium cotton fabric with a plush filling. Perfect for adding comfort and style to your living space.',
        shortDescription: 'Comfortable blue decorative pillow',
        price: 24.99,
        compareAtPrice: 29.99,
        category: categoryMap['living'],
        images: [
          '/assets/images/products/product-4.jpg'
        ],
        stock: 30,
        trackInventory: true,
        featured: true,
        tags: ['pillow', 'decorative', 'living room', 'blue']
      },
      {
        name: 'Trellis',
        description: 'Garden trellis for climbing plants. Made from weather-resistant materials, perfect for outdoor use. Helps support and guide your plants as they grow.',
        shortDescription: 'Weather-resistant garden trellis',
        price: 35.99,
        compareAtPrice: 45.99,
        category: categoryMap['outdoor'],
        images: [
          '/assets/images/products/product-5.jpg'
        ],
        stock: 20,
        trackInventory: true,
        featured: false,
        tags: ['trellis', 'garden', 'outdoor', 'plants']
      },
      {
        name: 'Dinner Table',
        description: 'Elegant dining table that seats 6 people. Made from solid wood with a beautiful finish. Perfect for family dinners and entertaining guests.',
        shortDescription: 'Solid wood dining table for 6',
        price: 299.99,
        compareAtPrice: 349.99,
        category: categoryMap['dining'],
        images: [
          '/assets/images/products/product-6.jpg'
        ],
        stock: 10,
        trackInventory: true,
        featured: true,
        tags: ['table', 'dining', 'furniture', 'wood']
      },
      {
        name: 'Wooden Arm Chair',
        description: 'Comfortable armchair with wooden frame. Upholstered in premium fabric with plush cushioning. Perfect for reading or relaxing in your living room.',
        shortDescription: 'Comfortable wooden armchair',
        price: 149.99,
        compareAtPrice: 179.99,
        category: categoryMap['living'],
        images: [
          '/assets/images/products/product-7.jpg'
        ],
        stock: 15,
        trackInventory: true,
        featured: true,
        tags: ['chair', 'armchair', 'living room', 'wooden']
      },
      {
        name: 'Bureau',
        description: 'Classic wooden bureau with multiple drawers. Perfect for bedroom storage. Features smooth drawer slides and a beautiful finish.',
        shortDescription: 'Classic wooden bedroom bureau',
        price: 199.99,
        compareAtPrice: 249.99,
        category: categoryMap['bedroom'],
        images: [
          '/assets/images/products/product-8.jpg'
        ],
        stock: 12,
        trackInventory: true,
        featured: false,
        tags: ['bureau', 'bedroom', 'storage', 'furniture']
      },
      {
        name: 'Sleepwear Set',
        description: 'Comfortable sleepwear set made from soft cotton. Includes top and bottom. Perfect for a good night\'s sleep.',
        shortDescription: 'Soft cotton sleepwear set',
        price: 39.99,
        compareAtPrice: 49.99,
        category: categoryMap['bedroom'],
        images: [
          '/assets/images/products/product-9.jpg'
        ],
        stock: 40,
        trackInventory: true,
        featured: false,
        tags: ['sleepwear', 'bedroom', 'clothing', 'cotton'],
        variants: {
          'Size': [
            { name: 'Size', value: 'Small', priceModifier: 0, stock: 10, sku: 'SS-S' },
            { name: 'Size', value: 'Medium', priceModifier: 0, stock: 15, sku: 'SS-M' },
            { name: 'Size', value: 'Large', priceModifier: 0, stock: 10, sku: 'SS-L' },
            { name: 'Size', value: 'X-Large', priceModifier: 5, stock: 5, sku: 'SS-XL' }
          ]
        }
      },
      {
        name: 'Clothes Chest',
        description: 'Spacious wooden chest for storing clothes. Features a large storage capacity and beautiful design. Perfect for bedroom organization.',
        shortDescription: 'Spacious wooden clothes chest',
        price: 179.99,
        compareAtPrice: 219.99,
        category: categoryMap['bedroom'],
        images: [
          '/assets/images/products/product-10.jpg'
        ],
        stock: 8,
        trackInventory: true,
        featured: false,
        tags: ['chest', 'bedroom', 'storage', 'wooden']
      },
      {
        name: 'Office Drawer',
        description: 'Functional office drawer unit with multiple compartments. Perfect for organizing office supplies and documents.',
        shortDescription: 'Functional office drawer unit',
        price: 89.99,
        compareAtPrice: 109.99,
        category: categoryMap['office'],
        images: [
          '/assets/images/products/product-11.jpg'
        ],
        stock: 18,
        trackInventory: true,
        featured: false,
        tags: ['drawer', 'office', 'storage', 'organization']
      },
      {
        name: 'Modern Desk Lamp',
        description: 'Sleek modern desk lamp with adjustable brightness. Perfect for your office or study area. LED technology for energy efficiency.',
        shortDescription: 'Sleek adjustable desk lamp',
        price: 45.99,
        compareAtPrice: 59.99,
        category: categoryMap['office'],
        images: [
          '/assets/images/products/product-12.jpg'
        ],
        stock: 25,
        trackInventory: true,
        featured: true,
        tags: ['lamp', 'office', 'lighting', 'LED']
      },
      {
        name: 'Ergonomic Office Chair',
        description: 'Comfortable ergonomic office chair with lumbar support. Adjustable height and armrests. Perfect for long work sessions.',
        shortDescription: 'Ergonomic office chair with lumbar support',
        price: 199.99,
        compareAtPrice: 249.99,
        category: categoryMap['office'],
        images: [
          '/assets/images/products/product-1.jpg'
        ],
        stock: 14,
        trackInventory: true,
        featured: true,
        tags: ['chair', 'office', 'ergonomic', 'comfortable']
      },
      {
        name: 'Kitchen Storage Container',
        description: 'Airtight kitchen storage containers for keeping food fresh. Set of 5 containers in various sizes. BPA-free plastic.',
        shortDescription: 'Airtight kitchen storage container set',
        price: 29.99,
        compareAtPrice: 39.99,
        category: categoryMap['kitchen'],
        images: [
          '/assets/images/products/product-13.jpg'
        ],
        stock: 35,
        trackInventory: true,
        featured: false,
        tags: ['container', 'kitchen', 'storage', 'food']
      },
      {
        name: 'Wooden Box',
        description: 'Decorative wooden box perfect for storage or display. Handcrafted with attention to detail. Great for organizing small items.',
        shortDescription: 'Handcrafted decorative wooden box',
        price: 19.99,
        compareAtPrice: 24.99,
        category: categoryMap['outdoor'],
        images: [
          '/assets/images/products/product-14.jpg'
        ],
        stock: 22,
        trackInventory: true,
        featured: false,
        tags: ['box', 'wooden', 'storage', 'decorative']
      },
      {
        name: 'Garden Bench',
        description: 'Weather-resistant garden bench. Perfect for outdoor seating. Made from durable materials that withstand the elements.',
        shortDescription: 'Weather-resistant outdoor garden bench',
        price: 129.99,
        compareAtPrice: 159.99,
        category: categoryMap['outdoor'],
        images: [
          '/assets/images/products/product-15.jpg'
        ],
        stock: 11,
        trackInventory: true,
        featured: true,
        tags: ['bench', 'garden', 'outdoor', 'seating']
      },
      {
        name: 'Coffee Table',
        description: 'Modern coffee table with glass top and wooden base. Perfect centerpiece for your living room. Sleek and functional design.',
        shortDescription: 'Modern glass-top coffee table',
        price: 159.99,
        compareAtPrice: 199.99,
        category: categoryMap['living'],
        images: [
          '/assets/images/products/product-16.jpg'
        ],
        stock: 9,
        trackInventory: true,
        featured: true,
        tags: ['table', 'coffee table', 'living room', 'modern']
      },
      {
        name: 'Bed Frame',
        description: 'Sturdy wooden bed frame with headboard. Available in multiple sizes. Easy assembly with included instructions.',
        shortDescription: 'Sturdy wooden bed frame with headboard',
        price: 349.99,
        compareAtPrice: 399.99,
        category: categoryMap['bedroom'],
        images: [
          '/assets/images/products/product-17.jpg'
        ],
        stock: 7,
        trackInventory: true,
        featured: true,
        tags: ['bed', 'bedroom', 'furniture', 'wooden'],
        variants: {
          'Size': [
            { name: 'Size', value: 'Twin', priceModifier: 0, stock: 2, sku: 'BF-TWIN' },
            { name: 'Size', value: 'Full', priceModifier: 50, stock: 2, sku: 'BF-FULL' },
            { name: 'Size', value: 'Queen', priceModifier: 100, stock: 2, sku: 'BF-QUEEN' },
            { name: 'Size', value: 'King', priceModifier: 150, stock: 1, sku: 'BF-KING' }
          ]
        }
      },
      {
        name: 'Dining Chair Set',
        description: 'Set of 4 matching dining chairs. Comfortable seating with elegant design. Perfect complement to any dining table.',
        shortDescription: 'Set of 4 matching dining chairs',
        price: 199.99,
        compareAtPrice: 249.99,
        category: categoryMap['dining'],
        images: [
          '/assets/images/products/product-18.jpg'
        ],
        stock: 13,
        trackInventory: true,
        featured: true,
        tags: ['chairs', 'dining', 'set', 'furniture']
      },
      {
        name: 'Kitchen Island',
        description: 'Spacious kitchen island with storage. Perfect for food preparation and additional workspace. Includes drawers and shelves.',
        shortDescription: 'Spacious kitchen island with storage',
        price: 499.99,
        compareAtPrice: 599.99,
        category: categoryMap['kitchen'],
        images: [
          '/assets/images/products/product-19.jpg'
        ],
        stock: 5,
        trackInventory: true,
        featured: true,
        tags: ['island', 'kitchen', 'storage', 'furniture']
      }
    ];

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Generate slugs manually (since insertMany doesn't trigger pre-save hooks)
    const productsWithSlugs = products.map(product => ({
      ...product,
      slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }));

    // Insert products
    const createdProducts = await Product.insertMany(productsWithSlugs);
    console.log(`✅ Seeded ${createdProducts.length} products successfully`);

    // Display created products
    createdProducts.forEach(product => {
      console.log(`  - ${product.name} (Rs ${product.price}) - Stock: ${product.stock}`);
    });

    return createdProducts;
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
};

export default seedProducts;
