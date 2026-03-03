import User from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { generateToken, isValidObjectId } from '../utils/helpers.js';
import { sendEmail } from '../config/email.js';
import { welcomeEmailTemplate } from '../utils/emailTemplates.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new AppError('User already exists with this email', 400);
    }

    const user = await User.create({
      name,
      email,
      password
    });

    const token = generateToken(user._id);

    // Send welcome email
    try {
      await sendEmail(user.email, 'Welcome to Shahbaz Store!', welcomeEmailTemplate(user));
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 401);
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        throw new AppError('Email already in use', 400);
      }
      user.email = email;
    }
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentlyViewed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'recentlyViewed.product',
        select: 'name slug price images averageRating'
      });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Sort by most recently viewed
    const recentlyViewed = user.recentlyViewed
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
      .slice(0, 20)
      .map(item => item.product)
      .filter(product => product !== null);

    res.json({
      success: true,
      products: recentlyViewed
    });
  } catch (error) {
    next(error);
  }
};

export const addToRecentlyViewed = async (req, res, next) => {
  try {
    const { productId } = req.body;
    
    if (!isValidObjectId(productId)) {
      throw new AppError('Invalid product ID format', 400);
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Remove if already exists
    user.recentlyViewed = user.recentlyViewed.filter(
      item => item.product.toString() !== productId
    );

    // Add to beginning
    user.recentlyViewed.unshift({
      product: productId,
      viewedAt: new Date()
    });

    // Keep only last 20
    if (user.recentlyViewed.length > 20) {
      user.recentlyViewed = user.recentlyViewed.slice(0, 20);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Added to recently viewed'
    });
  } catch (error) {
    next(error);
  }
};
