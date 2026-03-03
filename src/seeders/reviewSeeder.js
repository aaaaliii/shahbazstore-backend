import Review from '../models/Review.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const seedReviews = async () => {
  try {
    // Get products and users
    const products = await Product.find().limit(10);
    const users = await User.find({ role: 'customer' }).limit(5);

    if (products.length === 0) {
      console.log('⚠️  No products found. Skipping review seeding.');
      return;
    }

    if (users.length === 0) {
      console.log('⚠️  No users found. Skipping review seeding.');
      return;
    }

    // Clear existing reviews
    await Review.deleteMany({});
    console.log('Cleared existing reviews');

    const reviews = [];
    const reviewTemplates = [
      {
        rating: 5,
        title: 'Excellent Product!',
        comment: 'This product exceeded my expectations. High quality and great value for money. Highly recommended!'
      },
      {
        rating: 4,
        title: 'Very Good',
        comment: 'Good quality product. Works as described. Minor issues but overall satisfied with the purchase.'
      },
      {
        rating: 5,
        title: 'Perfect!',
        comment: 'Exactly what I was looking for. Fast shipping and excellent quality. Will definitely buy again!'
      },
      {
        rating: 3,
        title: 'Decent Product',
        comment: 'It\'s okay for the price. Does the job but could be better quality. Good for basic use.'
      },
      {
        rating: 4,
        title: 'Great Value',
        comment: 'Good product at a reasonable price. Meets my needs and I\'m happy with the purchase.'
      },
      {
        rating: 5,
        title: 'Amazing Quality',
        comment: 'Outstanding quality! Better than I expected. Well worth the money and looks great too.'
      },
      {
        rating: 4,
        title: 'Satisfied Customer',
        comment: 'Good product, fast delivery. Everything arrived in perfect condition. Would recommend.'
      },
      {
        rating: 2,
        title: 'Could Be Better',
        comment: 'Not quite what I expected. Quality is okay but there are better options available.'
      }
    ];

    // Create reviews for each product
    for (const product of products) {
      // Add 2-4 reviews per product
      const numReviews = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < numReviews && i < users.length; i++) {
        const user = users[i];
        const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
        
        reviews.push({
          product: product._id,
          user: user._id,
          rating: template.rating,
          title: template.title,
          comment: template.comment,
          isApproved: Math.random() > 0.2, // 80% approved
          helpful: Math.floor(Math.random() * 10),
          verifiedPurchase: Math.random() > 0.3 // 70% verified
        });
      }
    }

    // Insert reviews
    const createdReviews = await Review.insertMany(reviews);
    console.log(`✅ Seeded ${createdReviews.length} reviews successfully`);

    // Update product ratings
    for (const product of products) {
      const productReviews = await Review.find({ 
        product: product._id, 
        isApproved: true 
      });
      
      if (productReviews.length > 0) {
        const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
        await Product.updateOne(
          { _id: product._id },
          { 
            averageRating: Math.round(avgRating * 10) / 10,
            reviewCount: productReviews.length
          }
        );
      }
    }

    console.log('✅ Updated product ratings');

    return createdReviews;
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    throw error;
  }
};

export default seedReviews;
