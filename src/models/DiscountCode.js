import mongoose from 'mongoose';

const discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required']
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.type === 'percentage') {
          return value >= 0 && value <= 100;
        }
        return value >= 0;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: 0
  },
  maxUses: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  expiryDate: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// code index is automatically created by unique: true
discountCodeSchema.index({ isActive: 1, expiryDate: 1 });

export default mongoose.model('DiscountCode', discountCodeSchema);
