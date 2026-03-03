import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const productSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().min(10).required(),
  shortDescription: Joi.string().trim().allow(''),
  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(0).allow(null),
  category: Joi.string().required(),
  image: Joi.string().allow('', null),
  images: Joi.array().items(Joi.string()).default([]),
  stock: Joi.number().min(0).default(0),
  trackInventory: Joi.boolean().default(true),
  lowStockThreshold: Joi.number().min(0).default(10),
  sku: Joi.string().allow('', null),
  isActive: Joi.boolean().default(true),
  featured: Joi.boolean().default(false),
  metaTitle: Joi.string().allow(''),
  metaDescription: Joi.string().allow(''),
  tags: Joi.array().items(Joi.string()).default([]),
  relatedProducts: Joi.array().items(Joi.string()).default([]),
  variants: Joi.object().pattern(
    Joi.string(),
    Joi.array().items(Joi.object({
      name: Joi.string(),
      value: Joi.string().required(),
      priceModifier: Joi.number().default(0),
      sku: Joi.string().allow(''),
      barcode: Joi.string().trim().uppercase().allow('', null),
      stock: Joi.number().min(0).default(0),
      image: Joi.string().allow('')
    }))
  ).allow(null),
  barcode: Joi.string().trim().uppercase().allow('', null)
}).custom((value, helpers) => {
  // Custom validation: If product has variants, price is treated as basePrice
  // If product has NO variants, price is the actual selling price (required)
  // This is handled in the controller, but we validate structure here
  const hasVariants = value.variants && 
    typeof value.variants === 'object' && 
    Object.keys(value.variants).length > 0;
  
  // Price is always required (either as actual price or base price)
  // The distinction is logical, not structural
  return value;
});

export const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().allow(''),
  image: Joi.string().allow(''),
  parent: Joi.string().allow(null, ''),
  isActive: Joi.boolean().default(true),
  order: Joi.number().default(0)
});

export const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().allow(''),
  comment: Joi.string().trim().min(10).required(),
  images: Joi.array().items(Joi.string()).default([])
});

export const discountCodeSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  type: Joi.string().valid('percentage', 'fixed').required(),
  value: Joi.number().min(0).when('type', {
    is: 'percentage',
    then: Joi.number().max(100).required(),
    otherwise: Joi.number().required()
  }),
  minPurchase: Joi.number().min(0).default(0),
  maxUses: Joi.number().min(1).allow(null),
  expiryDate: Joi.date().allow(null),
  isActive: Joi.boolean().default(true)
});

export const headerLinkSchema = Joi.object({
  label: Joi.string().trim().min(1).required(),
  url: Joi.string().trim().required(),
  order: Joi.number().default(0),
  isActive: Joi.boolean().default(true),
  openInNewTab: Joi.boolean().default(false)
  // URL validation is done in the controller to access both url and openInNewTab fields
});

export const bannerSettingsSchema = Joi.object({
  text: Joi.string().trim().min(1).required(),
  linkText: Joi.string().trim().allow('').default('Shop Now!'),
  linkUrl: Joi.string().trim().default('/products'),
  isActive: Joi.boolean().default(true)
});

export const settingsSchema = Joi.object({
  banner: Joi.object({
    text: Joi.string().trim().min(1),
    linkText: Joi.string().trim().allow(''),
    linkUrl: Joi.string().trim(),
    isActive: Joi.boolean()
  }).optional(),
  site: Joi.object({
    name: Joi.string().trim(),
    email: Joi.string().email().allow(''),
    phone: Joi.string().trim().allow(''),
    address: Joi.string().trim().allow('')
  }).optional(),
  social: Joi.object({
    facebook: Joi.string().uri().allow(''),
    instagram: Joi.string().uri().allow(''),
    twitter: Joi.string().uri().allow('')
  }).optional(),
  seo: Joi.object({
    metaTitle: Joi.string().trim().allow(''),
    metaDescription: Joi.string().trim().allow('')
  }).optional(),
  deliveryCharges: Joi.object({
    amount: Joi.number().min(0).default(0),
    freeDeliveryThreshold: Joi.number().min(0).default(0)
  }).optional(),
  homepageCategories: Joi.array().items(
    Joi.object({
      categoryId: Joi.string().required(),
      image: Joi.string().required(),
      position: Joi.number().integer().min(1).max(4).required(),
      title: Joi.string().trim().allow(''),
      subtitle: Joi.string().trim().allow(''),
      link: Joi.string().trim().allow(''),
      linkText: Joi.string().trim().allow(''),
      isActive: Joi.boolean().default(true)
    })
  ).length(4).optional() // Must be exactly 4 items
});

export const orderItemSchema = Joi.object({
  product: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  selectedVariant: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      name: Joi.string(),
      value: Joi.string(),
      priceModifier: Joi.number(),
      stock: Joi.number(),
      sku: Joi.string(),
      image: Joi.string()
    })
  ).allow(null)
});

export const orderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  discountCode: Joi.string().trim().uppercase().allow('', null),
  billingAddress: Joi.object({
    firstName: Joi.string().trim().allow(''),
    lastName: Joi.string().trim().allow(''),
    street: Joi.string().trim().allow(''),
    city: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    zipCode: Joi.string().trim().allow(''),
    country: Joi.string().trim().allow(''),
    phone: Joi.string().trim().allow(''),
    email: Joi.string().email().trim().allow('')
  }).allow(null),
  shippingAddress: Joi.object({
    firstName: Joi.string().trim().allow(''),
    lastName: Joi.string().trim().allow(''),
    street: Joi.string().trim().allow(''),
    city: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    zipCode: Joi.string().trim().allow(''),
    country: Joi.string().trim().allow(''),
    phone: Joi.string().trim().allow(''),
    email: Joi.string().email().trim().allow('')
  }).allow(null),
  deliveryCharges: Joi.number().min(0).default(0)
});

export const orderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled').required()
});

export const validateDiscountCodeSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  totalAmount: Joi.number().min(0).required()
});

export const profileUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).allow(''),
  email: Joi.string().email().allow(''),
  phone: Joi.string().trim().allow(''),
  address: Joi.object({
    street: Joi.string().trim().allow(''),
    city: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    zipCode: Joi.string().trim().allow(''),
    country: Joi.string().trim().allow('')
  }).allow(null)
});

export const recentlyViewedSchema = Joi.object({
  productId: Joi.string().required()
});

export const headerLinkReorderSchema = Joi.object({
  links: Joi.array().items(
    Joi.object({
      id: Joi.string().required()
    })
  ).min(1).required()
});

export const wishlistAddSchema = Joi.object({
  productId: Joi.string().required(),
  selectedVariant: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      name: Joi.string(),
      value: Joi.string(),
      priceModifier: Joi.number(),
      stock: Joi.number(),
      sku: Joi.string(),
      image: Joi.string()
    })
  ).allow(null)
});

export const analyticsTrackSchema = Joi.object({
  eventType: Joi.string().valid('page_view', 'product_view', 'add_to_cart', 'purchase', 'search').required(),
  productId: Joi.string().allow('', null),
  categoryId: Joi.string().allow('', null),
  metadata: Joi.object().allow(null)
});

// Query parameter validation helpers
export const validateQueryParams = {
  page: (page, defaultPage = 1) => {
    const num = Number(page);
    if (isNaN(num) || num < 1) return defaultPage;
    return Math.floor(num);
  },
  limit: (limit, defaultLimit = 12, maxLimit = 100) => {
    const num = Number(limit);
    if (isNaN(num) || num < 1) return defaultLimit;
    return Math.min(Math.floor(num), maxLimit);
  },
  days: (days, defaultDays = 30, maxDays = 365) => {
    const num = Number(days);
    if (isNaN(num) || num < 1) return defaultDays;
    return Math.min(Math.floor(num), maxDays);
  },
  price: (price) => {
    const num = Number(price);
    if (isNaN(num) || num < 0) return null;
    return num;
  },
  rating: (rating) => {
    const num = Number(rating);
    if (isNaN(num) || num < 0 || num > 5) return null;
    return num;
  },
  sortBy: (sortBy, allowedFields = [], defaultSort = 'createdAt') => {
    if (!sortBy || !allowedFields.includes(sortBy)) return defaultSort;
    return sortBy;
  },
  sortOrder: (sortOrder, defaultOrder = 'desc') => {
    if (sortOrder === 'asc' || sortOrder === 'desc') return sortOrder;
    return defaultOrder;
  }
};

export const validate = (schema) => {
  return (req, res, next) => {
    // Parse JSON strings in FormData (for arrays and objects)
    const body = { ...req.body };
    Object.keys(body).forEach(key => {
      const value = body[key];
      if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
        try {
          body[key] = JSON.parse(value);
        } catch (e) {
          // If parsing fails, keep original value
        }
      }
    });

    const { error, value } = schema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true // Convert types (e.g., string to number)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace req.body with validated and converted values
    req.body = value;
    next();
  };
};
