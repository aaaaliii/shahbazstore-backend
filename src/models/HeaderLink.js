import mongoose from 'mongoose';

const headerLinkSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Link label is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'Link URL is required'],
    trim: true
  },
  order: {
    type: Number,
    required: [true, 'Link order is required'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  openInNewTab: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

headerLinkSchema.index({ order: 1, isActive: 1 });

export default mongoose.model('HeaderLink', headerLinkSchema);
