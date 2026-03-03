import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: String,
  image: String,
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate slug from name before saving
categorySchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  
  // Prevent circular reference: a category cannot be its own parent
  if (this.parent && this.parent.toString() === this._id.toString()) {
    return next(new Error('Category cannot be its own parent'));
  }
  
  // Prevent deep nesting: check if parent exists and is not a child category
  if (this.parent) {
    const Category = mongoose.model('Category');
    const parentCategory = await Category.findById(this.parent);
    if (!parentCategory) {
      return next(new Error('Parent category not found'));
    }
    // Prevent setting a child category as parent (max depth of 2 levels)
    if (parentCategory.parent) {
      return next(new Error('Cannot nest categories more than 2 levels deep'));
    }
  }
  
  next();
});

export default mongoose.model('Category', categorySchema);
