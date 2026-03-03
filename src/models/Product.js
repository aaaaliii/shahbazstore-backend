import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  name: String,
  value: String,
  priceModifier: {
    type: Number,
    default: 0
  },
  sku: String,
  barcode: {
    type: String,
    trim: true,
    uppercase: true
  },
  stock: {
    type: Number,
    default: 0
  },
  image: String
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  shortDescription: String,
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  compareAtPrice: Number,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  image: String,
  images: [String],
  variants: {
    type: Map,
    of: [variantSchema],
    default: new Map()
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  trackInventory: {
    type: Boolean,
    default: true
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  metaTitle: String,
  metaDescription: String,
  tags: [String],
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate barcode helper function
const generateBarcode = async (Product, excludeId = null) => {
  let barcode;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 20; // Increased attempts for better reliability

  while (!isUnique && attempts < maxAttempts) {
    // Format: PRD + timestamp (last 8 digits) + random (4 digits) = 15 characters
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    barcode = `PRD${timestamp}${random}`;

    // Check if barcode already exists (excluding current product if updating)
    const query = { barcode };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Product.findOne(query);
    if (!exists) {
      isUnique = true;
    }
    attempts++;
    
    // Small delay to reduce collision chance in high-concurrency scenarios
    if (!isUnique && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique barcode after multiple attempts. Please try again or provide a manual barcode.');
  }

  return barcode;
};

// Generate variant barcode helper function
const generateVariantBarcode = (productBarcode, variantIndex) => {
  // Format: Product barcode + variant index (padded to 4 digits for up to 9999 variants)
  // This allows up to 9999 variants per product
  const variantSuffix = String(variantIndex).padStart(4, '0');
  return `${productBarcode}V${variantSuffix}`;
};

// Generate slug and barcode before saving
productSchema.pre('save', async function(next) {
  try {
    // Validate variant/price relationship
    const hasVariants = this.variants && this.variants.size > 0;
    
    // Price is always required:
    // - If product has variants: price is the base price
    // - If product has NO variants: price is the actual selling price
    if (this.price === undefined || this.price === null) {
      return next(new Error('Product price is required'));
    }
    
    if (this.price < 0) {
      return next(new Error('Product price cannot be negative'));
    }
    
    // If product has variants, price is treated as basePrice
    // Variants calculate their price as: basePrice + priceModifier
    // This is enforced logically - the price field serves dual purpose
    
    // Generate slug if not provided
    if (this.isModified('name') && !this.slug) {
      this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Generate barcode if not provided (for new products or existing products without barcode)
    if (!this.barcode) {
      this.barcode = await generateBarcode(this.constructor, this._id);
    }

    // Generate barcodes for variants if not provided
    if (this.variants && this.variants.size > 0) {
      // Collect all existing variant barcodes to check for duplicates
      const existingBarcodes = new Set();
      let maxVariantIndex = -1;

      // First pass: collect existing barcodes and find max index
      for (const [variantType, variantArray] of this.variants.entries()) {
        for (const variant of variantArray) {
          if (variant.barcode) {
            // Check for duplicate barcodes within the same product
            if (existingBarcodes.has(variant.barcode)) {
              throw new Error(`Duplicate variant barcode found: ${variant.barcode}. Each variant must have a unique barcode.`);
            }
            existingBarcodes.add(variant.barcode);

            // Extract index from variant barcode format: {productBarcode}V{index}
            const match = variant.barcode.match(/V(\d+)$/);
            if (match) {
              const index = parseInt(match[1], 10);
              if (index > maxVariantIndex) {
                maxVariantIndex = index;
              }
            }
          }
        }
      }

      // Start from next index after the highest existing one
      let variantIndex = maxVariantIndex + 1;

      // Second pass: generate barcodes for variants without them
      for (const [variantType, variantArray] of this.variants.entries()) {
        const updatedVariants = [];
        for (let i = 0; i < variantArray.length; i++) {
          const variant = { ...variantArray[i] };
          // Only generate barcode if not provided (allows manual entry)
          if (!variant.barcode) {
            let newBarcode;
            let attempts = 0;
            const maxAttempts = 100; // Allow up to 100 attempts to find unique barcode
            
            // Generate unique variant barcode
            do {
              newBarcode = generateVariantBarcode(this.barcode, variantIndex);
              variantIndex++;
              attempts++;
              
              // If we've tried many times, use a more unique approach
              if (attempts > 50) {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
                newBarcode = `${this.barcode}V${randomSuffix}`;
              }
            } while (existingBarcodes.has(newBarcode) && attempts < maxAttempts);

            if (existingBarcodes.has(newBarcode)) {
              throw new Error('Failed to generate unique variant barcode. Please provide manual barcodes.');
            }

            variant.barcode = newBarcode;
            existingBarcodes.add(newBarcode);
          }
          updatedVariants.push(variant);
        }
        this.variants.set(variantType, updatedVariants);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for performance
productSchema.index({ category: 1, isActive: 1 });
// slug index is automatically created by unique: true
// barcode index is automatically created by index: true
productSchema.index({ featured: 1, isActive: 1 });
productSchema.index({ viewCount: -1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Product', productSchema);
