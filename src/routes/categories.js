import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, categorySchema } from '../utils/validators.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', authenticate, authorize('admin'), validate(categorySchema), createCategory);
router.put('/:id', authenticate, authorize('admin'), validate(categorySchema), updateCategory);
router.delete('/:id', authenticate, authorize('admin'), deleteCategory);

export default router;
