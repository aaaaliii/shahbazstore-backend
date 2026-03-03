import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: String,
  comment: {
    type: String,
    required: [true, 'Review comment is required']
  },
  images: [String],
  helpful: {
    type: Number,
    default: 0
  },
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
