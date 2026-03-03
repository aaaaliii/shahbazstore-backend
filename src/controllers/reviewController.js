import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId, getPaginationParams, safeNumber } from '../utils/helpers.js';
import { validateQueryParams } from '../utils/validators.js';

const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId, isApproved: true });
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  await Product.findByIdAndUpdate(productId, {
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount: reviews.length
  });
};

export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    if (!isValidObjectId(productId)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const { sortBy } = req.query;
    const allowedSortFields = ['createdAt', 'rating', 'helpful'];
    const validatedSortBy = validateQueryParams.sortBy(sortBy, allowedSortFields, 'createdAt');
    const { page, limit, skip } = getPaginationParams(req.query, 10, 50);

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const reviews = await Review.find({ 
      product: productId, 
      isApproved: true 
    })
      .populate('user', 'name')
      .sort({ [validatedSortBy]: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ product: productId, isApproved: true });

    res.json({
      success: true,
      reviews,
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

export const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    if (!isValidObjectId(productId)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const { rating, title, comment, images } = req.body;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      throw new AppError('You have already reviewed this product', 400);
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      title,
      comment,
      images,
      isApproved: false // Reviews require admin approval
    });

    // Don't update product rating for unapproved reviews
    // Rating will be updated when admin approves the review

    res.status(201).json({
      success: true,
      review
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('You have already reviewed this product', 400));
    }
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid review ID format', 400);
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized to update this review', 403);
    }

    Object.assign(review, req.body);
    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.json({
      success: true,
      review
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid review ID format', 400);
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized to delete this review', 403);
    }

    const productId = review.product;
    await review.deleteOne();

    // Update product rating
    await updateProductRating(productId);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const markHelpful = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid review ID format', 400);
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    review.helpful += 1;
    await review.save();

    res.json({
      success: true,
      review
    });
  } catch (error) {
    next(error);
  }
};

export const approveReview = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid review ID format', 400);
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    review.isApproved = true;
    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.json({
      success: true,
      review
    });
  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (req, res, next) => {
  try {
    const { isApproved } = req.query;
    const query = {};

    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    const { page, limit, skip } = getPaginationParams(req.query, 20, 100);

    const reviews = await Review.find(query)
      .populate('product', 'name slug')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      reviews,
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
