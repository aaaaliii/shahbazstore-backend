import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Analytics from '../models/Analytics.js';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId, getPaginationParams, safeNumber } from '../utils/helpers.js';
import { validateQueryParams } from '../utils/validators.js';
import { searchProducts as elasticsearchSearch, indexProduct, updateProductIndex, deleteProductIndex } from '../services/elasticsearchService.js';

export const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      featured,
      tags,
      sortBy,
      sortOrder
    } = req.query;

    // Validate and sanitize price filters
    const validatedMinPrice = safeNumber(minPrice, null, 0);
    const validatedMaxPrice = safeNumber(maxPrice, null, 0);
    
    // Validate price range
    if (validatedMinPrice !== null && validatedMaxPrice !== null && validatedMinPrice > validatedMaxPrice) {
      throw new AppError('Minimum price cannot be greater than maximum price', 400);
    }

    // Validate category ID
    if (category && !isValidObjectId(category)) {
      throw new AppError('Invalid category ID format', 400);
    }

    // Validate sortBy and sortOrder
    const allowedSortFields = ['createdAt', 'name', 'price', 'averageRating', 'viewCount'];
    const validatedSortBy = validateQueryParams.sortBy(sortBy, allowedSortFields, 'createdAt');
    const validatedSortOrder = validateQueryParams.sortOrder(sortOrder, 'desc');

    // Validate pagination
    const { page, limit } = getPaginationParams(req.query, 12, 100);

    // Use Elasticsearch if search query is provided and Elasticsearch is enabled
    const useElasticsearch = search && search.trim() && process.env.ELASTICSEARCH_ENABLED === 'true';
    
    let products = [];
    let total = 0;

    if (useElasticsearch) {
      try {
        // Use Elasticsearch for search
        const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
        const searchResult = await elasticsearchSearch({
          search: search.trim(),
          category,
          minPrice: validatedMinPrice,
          maxPrice: validatedMaxPrice,
          minRating: safeNumber(minRating, null, 0, 5),
          inStock,
          featured: featured === 'true',
          tags: tagArray,
          sortBy: validatedSortBy,
          sortOrder: validatedSortOrder,
          page,
          limit
        });

        // Get full product documents from MongoDB using IDs from Elasticsearch
        const productIds = searchResult.products.map(p => p.id || p._id);
        if (productIds.length > 0) {
          const mongoProducts = await Product.find({
            _id: { $in: productIds },
            isActive: true
          })
            .populate('category', 'name slug')
            .lean();

          // Maintain Elasticsearch result order
          const productMap = new Map(mongoProducts.map(p => [p._id.toString(), p]));
          products = productIds
            .map(id => productMap.get(id.toString()))
            .filter(p => p !== undefined);
        }

        total = searchResult.total;
      } catch (elasticsearchError) {
        console.error('Elasticsearch error, falling back to MongoDB:', elasticsearchError);
        // Fall through to MongoDB search
      }
    }

    // Use MongoDB if Elasticsearch is not used or failed
    if (!useElasticsearch || products.length === 0) {
      const query = { isActive: true };

      if (category) {
        // Get all descendant category IDs (including the category itself)
        const Category = (await import('../models/Category.js')).default;
        const getAllDescendantIds = async (categoryId) => {
          const categoryIds = [categoryId];
          const getChildren = async (parentId) => {
            const children = await Category.find({ 
              parent: parentId,
              isActive: true 
            }).select('_id').lean();
            
            for (const child of children) {
              categoryIds.push(child._id);
              await getChildren(child._id); // Recursively get nested children
            }
          };
          
          await getChildren(categoryId);
          return categoryIds;
        };
        
        const categoryIds = await getAllDescendantIds(category);
        // If we have multiple categories, use $in, otherwise use direct match
        if (categoryIds.length > 1) {
          query.category = { $in: categoryIds };
        } else {
          query.category = categoryIds[0];
        }
      }

      if (featured === 'true') query.featured = true;
      
      if (validatedMinPrice !== null || validatedMaxPrice !== null) {
        query.price = {};
        if (validatedMinPrice !== null) query.price.$gte = validatedMinPrice;
        if (validatedMaxPrice !== null) query.price.$lte = validatedMaxPrice;
      }
      
      const validatedMinRating = safeNumber(minRating, null, 0, 5);
      if (validatedMinRating !== null) {
        query.averageRating = { $gte: validatedMinRating };
      }
      
      // Handle inStock filter - use $and to combine with search if needed
      const stockFilter = inStock === 'true' ? {
        $or: [
          { stock: { $gt: 0 } },
          { 'variants': { $exists: true, $ne: new Map() } }
        ]
      } : null;

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        query.tags = { $in: tagArray };
      }

      if (search) {
        // Sanitize search query to prevent regex injection
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Build search query to include product fields
        const searchConditions = [
          { name: { $regex: sanitizedSearch, $options: 'i' } },
          { description: { $regex: sanitizedSearch, $options: 'i' } },
          { shortDescription: { $regex: sanitizedSearch, $options: 'i' } },
          { tags: { $in: [new RegExp(sanitizedSearch, 'i')] } }
        ];
        
        // Only add category search if no explicit category filter is set
        // (if category filter is set, we only want to search within that category)
        if (!category) {
          // Find categories that match the search term
          const Category = (await import('../models/Category.js')).default;
          const matchingCategories = await Category.find({
            $or: [
              { name: { $regex: sanitizedSearch, $options: 'i' } },
              { slug: { $regex: sanitizedSearch, $options: 'i' } }
            ]
          }).select('_id').lean();
          
          const categoryIds = matchingCategories.map(cat => cat._id);
          
          // Add category search if matching categories found
          if (categoryIds.length > 0) {
            searchConditions.push({ category: { $in: categoryIds } });
          }
        }
        
        // Combine search with stock filter if both exist
        if (stockFilter) {
          query.$and = [
            { $or: searchConditions },
            stockFilter
          ];
        } else {
          query.$or = searchConditions;
        }
      } else if (stockFilter) {
        // Only stock filter, no search
        query.$or = stockFilter.$or;
      }

      const sortOptions = {};
      sortOptions[validatedSortBy] = validatedSortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      products = await Product.find(query)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      total = await Product.countDocuments(query);
    }

    // Track search analytics
    if (search) {
      await Analytics.create({
        eventType: 'search',
        metadata: { query: search, resultsCount: total, usedElasticsearch: useElasticsearch },
        user: req.user?._id
      });
    }

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    // Build query condition - only check _id if it's a valid ObjectId
    const queryConditions = [];
    if (isValidObjectId(req.params.id)) {
      queryConditions.push({ _id: req.params.id });
    }
    queryConditions.push({ slug: req.params.id });
    
    const product = await Product.findOne({ 
      $or: queryConditions,
      isActive: true
    })
      .populate('category', 'name slug')
      .populate('relatedProducts', 'name slug price images averageRating sku');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Increment view count
    product.viewCount += 1;
    await product.save();

    // Track product view
    await Analytics.create({
      eventType: 'product_view',
      product: product._id,
      category: product.category._id,
      user: req.user?._id
    });

    // Add to recently viewed if user is authenticated
    if (req.user) {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          user.recentlyViewed = user.recentlyViewed.filter(
            item => item.product.toString() !== product._id.toString()
          );
          user.recentlyViewed.unshift({
            product: product._id,
            viewedAt: new Date()
          });
          if (user.recentlyViewed.length > 20) {
            user.recentlyViewed = user.recentlyViewed.slice(0, 20);
          }
          await user.save();
        }
      } catch (err) {
        console.error('Error updating recently viewed:', err);
      }
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to validate variant/price relationship
const validateVariantPriceLogic = (productData, isUpdate = false, existingProduct = null) => {
  // Check if product has variants
  let hasVariants = false;
  let variantsMap = null;
  
  if (productData.variants) {
    if (typeof productData.variants === 'string') {
      try {
        productData.variants = JSON.parse(productData.variants);
      } catch (parseError) {
        throw new AppError('Invalid variants JSON format', 400);
      }
    }
    
    // Convert to Map and check if it has any variants
    variantsMap = new Map();
    Object.entries(productData.variants).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        variantsMap.set(key, value);
        hasVariants = true;
      }
    });
    
    if (hasVariants) {
      productData.variants = variantsMap;
    } else {
      // Empty variants object, treat as no variants
      productData.variants = new Map();
      hasVariants = false;
    }
  } else if (isUpdate && existingProduct && existingProduct.variants && existingProduct.variants.size > 0) {
    // Updating existing product that has variants
    hasVariants = true;
  }
  
  // Validation rules:
  // 1. If product has variants: price is required (as base price)
  // 2. If product has NO variants: price is required (as actual price)
  // 3. Price is always required, but its meaning depends on whether variants exist
  
  if (!productData.price && productData.price !== 0) {
    throw new AppError('Product price is required', 400);
  }
  
  if (productData.price < 0) {
    throw new AppError('Product price cannot be negative', 400);
  }
  
  // If product has variants, price is treated as basePrice
  // Variants will calculate their price as: basePrice + priceModifier
  // This is a logical distinction, not a structural one
  
  return { hasVariants, variantsMap };
};

export const createProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };
    
    // Debug logging
    console.log('Received productData.images:', productData.images);
    console.log('Type of images:', typeof productData.images);
    console.log('req.files:', req.files);
    
    // Validate variant/price relationship
    const { hasVariants, variantsMap } = validateVariantPriceLogic(productData);
    
    // Handle variants if provided (already converted to Map in validation)
    if (variantsMap) {
      productData.variants = variantsMap;
    }

    // Handle images - support both file uploads and pre-uploaded URLs
    if (req.files && req.files.length > 0) {
      // Upload files to Vercel Blob
      const { uploadMultipleToBlob } = await import('../utils/blobStorage.js');
      const filesToUpload = req.files.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        fieldname: file.fieldname
      }));
      
      const uploadedBlobs = await uploadMultipleToBlob(filesToUpload);
      const uploadedImages = uploadedBlobs.map(blob => blob.url);
      
      // If main image not set, use first uploaded image as main image
      if (!productData.image && uploadedImages.length > 0) {
        productData.image = uploadedImages[0];
      }
      
      productData.images = uploadedImages;
    } else if (productData.images) {
      // Handle images passed as JSON string in FormData or as array
      if (typeof productData.images === 'string') {
        try {
          productData.images = JSON.parse(productData.images);
        } catch (parseError) {
          // If not JSON, treat as single image string
          productData.images = [productData.images];
        }
      }
      // Ensure it's an array
      if (!Array.isArray(productData.images)) {
        productData.images = [productData.images];
      }
      
      // Filter out empty strings
      productData.images = productData.images.filter(img => img && img.trim() !== '');
      
      // If main image not set, use first image from array as main image
      if (!productData.image && productData.images.length > 0) {
        productData.image = productData.images[0];
      }
      
      // Ensure main image is in images array if not already there
      if (productData.image && !productData.images.includes(productData.image)) {
        productData.images.unshift(productData.image);
      }
    } else if (productData.image) {
      // Only main image provided, add it to images array
      productData.images = [productData.image];
    } else {
      // No images provided at all
      productData.images = [];
    }
    
    console.log('Final productData.images before save:', productData.images);
    console.log('Final productData.image:', productData.image);

    const product = await Product.create(productData);
    
    // Populate category for indexing
    await product.populate('category', 'name slug');

    // Index in Elasticsearch if enabled
    if (process.env.ELASTICSEARCH_ENABLED === 'true') {
      try {
        await indexProduct(product);
      } catch (indexError) {
        console.error('Error indexing product in Elasticsearch:', indexError);
        // Don't fail the request if indexing fails
      }
    }

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.barcode) {
        return next(new AppError('Product with this barcode already exists', 400));
      }
      return next(new AppError('Product with this slug or SKU already exists', 400));
    }
    // Handle barcode generation errors
    if (error.message && error.message.includes('barcode')) {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const updateData = { ...req.body };

    // Validate variant/price relationship
    const { hasVariants, variantsMap } = validateVariantPriceLogic(updateData, true, product);
    
    // Handle variants if provided (already converted to Map in validation)
    if (variantsMap) {
      updateData.variants = variantsMap;
    } else if (updateData.variants === null || updateData.variants === '') {
      // Explicitly removing variants
      updateData.variants = new Map();
    }

    // Handle main image - can be provided separately
    if (updateData.image !== undefined) {
      // Main image is provided, store it
      updateData.image = updateData.image;
    }

    // Handle images - support both file uploads and replacing with URLs
    if (updateData.images !== undefined) {
      // If images are provided in body (as JSON string or array), use them to replace
      if (typeof updateData.images === 'string') {
        try {
          updateData.images = JSON.parse(updateData.images);
        } catch (parseError) {
          // If not JSON, treat as single image string
          updateData.images = [updateData.images];
        }
      }
      if (!Array.isArray(updateData.images)) {
        updateData.images = [updateData.images];
      }
    }
    
    // If new files are uploaded, append them (or set if no images were in body)
    if (req.files && req.files.length > 0) {
      // Upload files to Vercel Blob
      const { uploadMultipleToBlob } = await import('../utils/blobStorage.js');
      const filesToUpload = req.files.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        fieldname: file.fieldname
      }));
      
      const uploadedBlobs = await uploadMultipleToBlob(filesToUpload);
      const newImages = uploadedBlobs.map(blob => blob.url);
      
      // If main image not set, use first uploaded image as main image
      if (!updateData.image && newImages.length > 0) {
        updateData.image = newImages[0];
      }
      
      if (updateData.images && Array.isArray(updateData.images)) {
        // Append new files to existing images array
        updateData.images = [...updateData.images, ...newImages];
      } else {
        // If no images in body, append to existing product images
        updateData.images = [...(product.images || []), ...newImages];
      }
    }
    
    // If main image not set but images array is provided, use first image as main
    if (!updateData.image && updateData.images && updateData.images.length > 0) {
      updateData.image = updateData.images[0];
    }
    
    // Ensure main image is in images array if not already there
    if (updateData.image && updateData.images && Array.isArray(updateData.images) && !updateData.images.includes(updateData.image)) {
      updateData.images.unshift(updateData.image);
    }

    Object.assign(product, updateData);
    await product.save();
    
    // Populate category for indexing
    await product.populate('category', 'name slug');

    // Update index in Elasticsearch if enabled
    if (process.env.ELASTICSEARCH_ENABLED === 'true') {
      try {
        await updateProductIndex(product);
      } catch (indexError) {
        console.error('Error updating product index in Elasticsearch:', indexError);
        // Don't fail the request if indexing fails
      }
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.barcode) {
        return next(new AppError('Product with this barcode already exists', 400));
      }
      return next(new AppError('Product with this slug or SKU already exists', 400));
    }
    // Handle barcode generation errors
    if (error.message && error.message.includes('barcode')) {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const productId = product._id;
    await product.deleteOne();

    // Delete from Elasticsearch index if enabled
    if (process.env.ELASTICSEARCH_ENABLED === 'true') {
      try {
        await deleteProductIndex(productId);
      } catch (indexError) {
        console.error('Error deleting product from Elasticsearch index:', indexError);
        // Don't fail the request if deletion from index fails
      }
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (req, res, next) => {
  try {
    // Build query condition - only check _id if it's a valid ObjectId
    const queryConditions = [];
    if (isValidObjectId(req.params.id)) {
      queryConditions.push({ _id: req.params.id });
    }
    queryConditions.push({ slug: req.params.id });
    
    const product = await Product.findOne({
      $or: queryConditions,
      isActive: true
    });
    
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Get manually assigned related products first
    let related = [];
    if (product.relatedProducts && product.relatedProducts.length > 0) {
      related = await Product.find({
        _id: { $in: product.relatedProducts },
        isActive: true
      })
        .limit(8)
        .select('name slug price images averageRating sku');
    }

    // If not enough, get from same category
    if (related.length < 8) {
      const sameCategory = await Product.find({
        category: product.category,
        _id: { $ne: product._id, $nin: related.map(p => p._id) },
        isActive: true
      })
        .limit(8 - related.length)
        .select('name slug price images averageRating sku');
      
      related = [...related, ...sameCategory];
    }

    res.json({
      success: true,
      products: related
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ viewCount: -1, averageRating: -1 })
      .limit(10)
      .select('name slug price images averageRating viewCount sku');

    res.json({
      success: true,
      products
    });
  } catch (error) {
    next(error);
  }
};

export const getShareData = async (req, res, next) => {
  try {
    // Build query condition - only check _id if it's a valid ObjectId
    const queryConditions = [];
    if (isValidObjectId(req.params.id)) {
      queryConditions.push({ _id: req.params.id });
    }
    queryConditions.push({ slug: req.params.id });
    
    const product = await Product.findOne({
      $or: queryConditions,
      isActive: true
    }).select('name description images metaTitle metaDescription');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const productUrl = `${baseUrl}/products/${product.slug || product._id}`;

    res.json({
      success: true,
      shareData: {
        title: product.metaTitle || product.name,
        description: product.metaDescription || product.description,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        url: productUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProductsForComparison = async (req, res, next) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      throw new AppError('Product IDs are required', 400);
    }

    const productIds = Array.isArray(ids) ? ids : ids.split(',');
    
    if (productIds.length > 4) {
      throw new AppError('Maximum 4 products can be compared', 400);
    }

    // Validate all product IDs
    for (const id of productIds) {
      if (!isValidObjectId(id)) {
        throw new AppError(`Invalid product ID format: ${id}`, 400);
      }
    }

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    })
      .populate('category', 'name')
      .select('name description price images averageRating stock variants tags sku');

    res.json({
      success: true,
      products
    });
  } catch (error) {
    next(error);
  }
};

export const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    
    if (!barcode) {
      throw new AppError('Barcode is required', 400);
    }

    const normalizedBarcode = barcode.toUpperCase().trim();

    // First, try to find product by barcode
    let product = await Product.findOne({ 
      barcode: normalizedBarcode,
      isActive: true
    })
      .populate('category', 'name slug');

    // If not found, search in variants
    // Since variants is stored as a Map, we need to iterate through products
    // But we'll use a cursor with early termination for better performance
    if (!product) {
      const productsCursor = Product.find({
        isActive: true,
        variants: { $exists: true, $ne: new Map() }
      })
        .populate('category', 'name slug')
        .cursor();

      // Use cursor to iterate and break early when found
      try {
        for await (const prod of productsCursor) {
          if (prod.variants && prod.variants.size > 0) {
            for (const [variantType, variantArray] of prod.variants.entries()) {
              const variant = variantArray.find(v => v.barcode === normalizedBarcode);
              if (variant) {
                product = prod;
                break;
              }
            }
            if (product) {
              break;
            }
          }
        }
      } finally {
        // Ensure cursor is closed even if there's an error
        if (productsCursor && typeof productsCursor.close === 'function') {
          try {
            await productsCursor.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
      }
    }

    if (!product) {
      throw new AppError('Product not found with this barcode', 404);
    }

    // Increment view count
    product.viewCount += 1;
    await product.save();

    // Track product view
    await Analytics.create({
      eventType: 'product_view',
      product: product._id,
      category: product.category._id,
      user: req.user?._id
    });

    // Add to recently viewed if user is authenticated
    if (req.user) {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          user.recentlyViewed = user.recentlyViewed.filter(
            item => item.product.toString() !== product._id.toString()
          );
          user.recentlyViewed.unshift({
            product: product._id,
            viewedAt: new Date()
          });
          if (user.recentlyViewed.length > 20) {
            user.recentlyViewed = user.recentlyViewed.slice(0, 20);
          }
          await user.save();
        }
      } catch (err) {
        console.error('Error updating recently viewed:', err);
      }
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get all descendant category IDs
const getAllDescendantIdsForCollections = async (categoryId) => {
  const Category = (await import('../models/Category.js')).default;
  const categoryIds = [categoryId];
  const getChildren = async (parentId) => {
    const children = await Category.find({ 
      parent: parentId,
      isActive: true 
    }).select('_id').lean();
    
    for (const child of children) {
      categoryIds.push(child._id);
      await getChildren(child._id); // Recursively get nested children
    }
  };
  
  await getChildren(categoryId);
  return categoryIds;
};

// Helper function to get a random category
export const getRandomCategory = async () => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const categories = await Category.find({ isActive: true })
      .select('_id')
      .lean();
    
    if (categories.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * categories.length);
    return categories[randomIndex]._id.toString();
  } catch (error) {
    console.error('Error getting random category:', error);
    return null;
  }
};

// Get product collections (featured, bestSelling, latest, topRated)
export const getProductCollections = async (req, res, next) => {
  try {
    const { type, category, limit = 4 } = req.query;
    const validatedLimit = Math.min(parseInt(limit) || 4, 20);
    
    // Validate type
    const validTypes = ['featured', 'bestSelling', 'latest', 'topRated'];
    if (!type || !validTypes.includes(type)) {
      throw new AppError(`Invalid collection type. Must be one of: ${validTypes.join(', ')}`, 400);
    }
    
    // Validate category if provided
    if (category && !isValidObjectId(category)) {
      throw new AppError('Invalid category ID format', 400);
    }

    let query = { isActive: true };
    let categoryIds = [];
    
    // Add category filter (including child categories)
    if (category) {
      categoryIds = await getAllDescendantIdsForCollections(category);
      // If we have multiple categories, use $in, otherwise use direct match
      if (categoryIds.length > 1) {
        query.category = { $in: categoryIds };
      } else {
        query.category = categoryIds[0];
      }
    }

    let products = [];

    switch (type) {
      case 'featured':
        products = await Product.find({ ...query, featured: true })
          .populate('category', 'name slug')
          .sort({ createdAt: -1 })
          .limit(validatedLimit)
          .lean();
        break;

      case 'bestSelling':
        // Aggregate from Order items to get total quantity sold
        const Order = (await import('../models/Order.js')).default;
        const bestSellingAggregation = await Order.aggregate([
          {
            $match: {
              status: { $in: ['confirmed', 'shipped', 'delivered'] }
            }
          },
          {
            $unwind: '$items'
          },
          {
            $group: {
              _id: '$items.product',
              totalSold: { $sum: '$items.quantity' }
            }
          },
          {
            $sort: { totalSold: -1 }
          },
          {
            $limit: validatedLimit * 3 // Get more to filter by category and active status
          },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product'
            }
          },
          {
            $unwind: '$product'
          },
          {
            $match: {
              'product.isActive': true,
              ...(category && categoryIds.length > 0 ? { 
                'product.category': categoryIds.length > 1 
                  ? { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) }
                  : new mongoose.Types.ObjectId(categoryIds[0])
              } : {})
            }
          },
          {
            $limit: validatedLimit
          },
          {
            $project: {
              _id: '$product._id',
              name: '$product.name',
              slug: '$product.slug',
              price: '$product.price',
              image: '$product.image',
              images: '$product.images',
              averageRating: '$product.averageRating',
              reviewCount: '$product.reviewCount',
              category: '$product.category',
              totalSold: 1
            }
          }
        ]);
        
        // Populate category for each product
        const Category = (await import('../models/Category.js')).default;
        for (const item of bestSellingAggregation) {
          if (item.category) {
            const cat = await Category.findById(item.category).select('name slug').lean();
            item.category = cat;
          }
        }
        products = bestSellingAggregation;
        break;

      case 'latest':
        products = await Product.find(query)
          .populate('category', 'name slug')
          .sort({ createdAt: -1 })
          .limit(validatedLimit)
          .lean();
        break;

      case 'topRated':
        products = await Product.find(query)
          .populate('category', 'name slug')
          .sort({ averageRating: -1, reviewCount: -1 })
          .limit(validatedLimit)
          .lean();
        break;
    }

    res.json({
      success: true,
      products,
      type,
      category: category || null
    });
  } catch (error) {
    next(error);
  }
};
