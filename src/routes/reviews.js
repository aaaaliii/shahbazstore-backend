import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  approveReview,
  getAllReviews
} from '../controllers/reviewController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, reviewSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/product/:productId', getProductReviews);
router.get('/', authenticate, authorize('admin'), getAllReviews);
router.post('/product/:productId', authenticate, validate(reviewSchema), createReview);
router.put('/:id', authenticate, validate(reviewSchema), updateReview);
router.delete('/:id', authenticate, deleteReview);
router.post('/:id/helpful', markHelpful);
router.put('/:id/approve', authenticate, authorize('admin'), approveReview);

export default router;
