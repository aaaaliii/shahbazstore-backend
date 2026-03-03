import DiscountCode from '../models/DiscountCode.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId } from '../utils/helpers.js';

export const getDiscountCodes = async (req, res, next) => {
  try {
    const discountCodes = await DiscountCode.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      discountCodes
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscountCode = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid discount code ID format', 400);
    }

    const discountCode = await DiscountCode.findById(req.params.id);

    if (!discountCode) {
      throw new AppError('Discount code not found', 404);
    }

    res.json({
      success: true,
      discountCode
    });
  } catch (error) {
    next(error);
  }
};

export const createDiscountCode = async (req, res, next) => {
  try {
    // Additional validation for percentage discount
    if (req.body.type === 'percentage' && req.body.value > 100) {
      throw new AppError('Percentage discount cannot exceed 100%', 400);
    }

    const discountCode = await DiscountCode.create(req.body);

    res.status(201).json({
      success: true,
      discountCode
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Discount code already exists', 400));
    }
    if (error.name === 'ValidationError') {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
};

export const updateDiscountCode = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid discount code ID format', 400);
    }

    const discountCode = await DiscountCode.findById(req.params.id);

    if (!discountCode) {
      throw new AppError('Discount code not found', 404);
    }

    // Additional validation for percentage discount
    const newType = req.body.type !== undefined ? req.body.type : discountCode.type;
    const newValue = req.body.value !== undefined ? req.body.value : discountCode.value;
    if (newType === 'percentage' && newValue > 100) {
      throw new AppError('Percentage discount cannot exceed 100%', 400);
    }

    Object.assign(discountCode, req.body);
    await discountCode.save();

    res.json({
      success: true,
      discountCode
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Discount code already exists', 400));
    }
    if (error.name === 'ValidationError') {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
};

export const deleteDiscountCode = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid discount code ID format', 400);
    }

    const discountCode = await DiscountCode.findById(req.params.id);

    if (!discountCode) {
      throw new AppError('Discount code not found', 404);
    }

    await discountCode.deleteOne();

    res.json({
      success: true,
      message: 'Discount code deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const validateDiscountCode = async (req, res, next) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code) {
      throw new AppError('Discount code is required', 400);
    }

    const discountCode = await DiscountCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true
    });

    if (!discountCode) {
      return res.json({
        valid: false,
        message: 'Invalid discount code'
      });
    }

    // Check expiry
    if (discountCode.expiryDate && new Date() > discountCode.expiryDate) {
      return res.json({
        valid: false,
        message: 'Discount code has expired'
      });
    }

    // Check max uses
    if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
      return res.json({
        valid: false,
        message: 'Discount code has reached maximum uses'
      });
    }

    // Check min purchase
    if (totalAmount && totalAmount < discountCode.minPurchase) {
      return res.json({
        valid: false,
        message: `Minimum purchase of Rs ${discountCode.minPurchase} required`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (totalAmount) {
      if (discountCode.type === 'percentage') {
        discountAmount = (totalAmount * discountCode.value) / 100;
      } else {
        discountAmount = discountCode.value;
      }
    }

    res.json({
      valid: true,
      discountAmount,
      discountCode: {
        id: discountCode._id,
        code: discountCode.code,
        type: discountCode.type,
        value: discountCode.value
      }
    });
  } catch (error) {
    next(error);
  }
};
