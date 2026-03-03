import express from 'express';
import {
  getDiscountCodes,
  getDiscountCode,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode
} from '../controllers/discountCodeController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, discountCodeSchema, validateDiscountCodeSchema } from '../utils/validators.js';

const router = express.Router();

router.post('/validate', validate(validateDiscountCodeSchema), validateDiscountCode);
router.get('/', authenticate, authorize('admin'), getDiscountCodes);
router.get('/:id', authenticate, authorize('admin'), getDiscountCode);
router.post('/', authenticate, authorize('admin'), validate(discountCodeSchema), createDiscountCode);
router.put('/:id', authenticate, authorize('admin'), validate(discountCodeSchema), updateDiscountCode);
router.delete('/:id', authenticate, authorize('admin'), deleteDiscountCode);

export default router;
