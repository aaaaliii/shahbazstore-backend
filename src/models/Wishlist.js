import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    selectedVariant: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// user index is automatically created by unique: true

export default mongoose.model('Wishlist', wishlistSchema);
