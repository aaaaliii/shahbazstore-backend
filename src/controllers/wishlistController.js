import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId } from '../utils/helpers.js';

export const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('products.product', 'name slug price images averageRating stock');

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    res.json({
      success: true,
      wishlist
    });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req, res, next) => {
  try {
    const { productId, selectedVariant } = req.body;

    if (!isValidObjectId(productId)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if product is active
    if (!product.isActive) {
      throw new AppError('Cannot add inactive product to wishlist', 400);
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    // Check if already in wishlist
    const exists = wishlist.products.some(
      p => p.product.toString() === productId
    );

    if (exists) {
      throw new AppError('Product already in wishlist', 400);
    }

    wishlist.products.push({
      product: productId,
      selectedVariant
    });

    await wishlist.save();
    await wishlist.populate('products.product', 'name slug price images averageRating');

    res.json({
      success: true,
      wishlist
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.productId)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404);
    }

    wishlist.products = wishlist.products.filter(
      p => p.product.toString() !== req.params.productId
    );

    await wishlist.save();
    await wishlist.populate('products.product', 'name slug price images averageRating');

    res.json({
      success: true,
      wishlist
    });
  } catch (error) {
    next(error);
  }
};
