import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Banner settings
  banner: {
    text: {
      type: String,
      default: 'Get 10% OFF at the Shahbaz Kitchen Selection -',
      trim: true
    },
    linkText: {
      type: String,
      default: 'Shop Now!',
      trim: true
    },
    linkUrl: {
      type: String,
      default: '/products',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  
  // Site settings (for future use)
  site: {
    name: {
      type: String,
      default: 'Shahbaz Store'
    },
    email: String,
    phone: String,
    address: String
  },
  
  // Social media links (for future use)
  social: {
    facebook: String,
    instagram: String,
    twitter: String
  },
  
  // SEO settings (for future use)
  seo: {
    metaTitle: String,
    metaDescription: String
  },
  
  // Delivery charges settings
  deliveryCharges: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);
