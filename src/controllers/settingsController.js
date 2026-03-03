import Settings from '../models/Settings.js';
import { AppError } from '../utils/errors.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
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
