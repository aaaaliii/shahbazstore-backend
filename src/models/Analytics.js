import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  eventType: {
    type: String,
    enum: ['page_view', 'product_view', 'add_to_cart', 'purchase', 'search'],
    required: [true, 'Event type is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

analyticsSchema.index({ eventType: 1, createdAt: -1 });
analyticsSchema.index({ product: 1, eventType: 1 });
analyticsSchema.index({ createdAt: -1 });

export default mongoose.model('Analytics', analyticsSchema);
