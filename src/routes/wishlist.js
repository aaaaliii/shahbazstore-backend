import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} from '../controllers/wishlistController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, wishlistAddSchema } from '../utils/validators.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getWishlist);
router.post('/', validate(wishlistAddSchema), addToWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
