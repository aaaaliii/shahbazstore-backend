import Settings from '../models/Settings.js';
import { AppError } from '../utils/errors.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    // Populate homepage categories with category details if they exist
    if (settings.homepageCategories && settings.homepageCategories.length > 0) {
      await settings.populate('homepageCategories.categoryId', 'name slug');
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      // Deep merge settings
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key]) && req.body[key] !== null) {
          settings[key] = { ...settings[key], ...req.body[key] };
        } else {
          settings[key] = req.body[key];
        }
      });
      await settings.save();
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

// Update specific section (e.g., just banner)
export const updateBanner = async (req, res, next) => {
  try {
    let settings = await Settings.getSettings();
    settings.banner = { ...settings.banner, ...req.body };
    await settings.save();
    
    res.json({
      success: true,
      banner: settings.banner
    });
  } catch (error) {
    next(error);
  }
};

// Update homepage categories - MUST be exactly 4 categories
export const updateHomepageCategories = async (req, res, next) => {
  try {
    let settings = await Settings.getSettings();
    
    const categories = req.body.homepageCategories || [];
    
    // STRICT VALIDATION: Must be exactly 4 categories
    if (categories.length !== 4) {
      throw new AppError('Exactly 4 homepage categories are required (no more, no less)', 400);
    }
    
    // Validate positions are exactly 1, 2, 3, 4
    const positions = categories.map(cat => cat.position).sort((a, b) => a - b);
    const requiredPositions = [1, 2, 3, 4];
    
    if (positions.length !== 4 || !positions.every((pos, idx) => pos === requiredPositions[idx])) {
      throw new AppError('Each category must have a unique position: 1, 2, 3, and 4', 400);
    }
    
    // Validate all required fields
    categories.forEach((cat, index) => {
      if (!cat.categoryId) {
        throw new AppError(`Category ID is required for position ${cat.position || index + 1}`, 400);
      }
      if (!cat.image) {
        throw new AppError(`Image is required for position ${cat.position || index + 1}`, 400);
      }
      if (cat.position < 1 || cat.position > 4) {
        throw new AppError(`Position must be between 1 and 4 for category at index ${index}`, 400);
      }
    });
    
    // Update homepage categories
    settings.homepageCategories = categories;
    await settings.save();
    
    // Populate category details
    await settings.populate('homepageCategories.categoryId', 'name slug');
    
    res.json({
      success: true,
      homepageCategories: settings.homepageCategories
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(error);
  }
};
