import express from 'express';
import {
  trackEvent,
  getPopularProducts,
  getDashboardStats
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, analyticsTrackSchema } from '../utils/validators.js';

const router = express.Router();

router.post('/track', validate(analyticsTrackSchema), trackEvent);
router.get('/popular-products', getPopularProducts);
router.get('/dashboard', authenticate, authorize('admin'), getDashboardStats);

export default router;
