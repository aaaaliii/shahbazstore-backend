import express from 'express';
import {
  getSettings,
  updateSettings,
  updateBanner
} from '../controllers/settingsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, bannerSettingsSchema, settingsSchema } from '../utils/validators.js';

const router = express.Router();

// Public endpoint - get all settings
router.get('/', getSettings);

// Admin endpoints
router.put('/', authenticate, authorize('admin'), validate(settingsSchema), updateSettings);
router.put('/banner', authenticate, authorize('admin'), validate(bannerSettingsSchema), updateBanner);

export default router;
