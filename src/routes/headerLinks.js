import express from 'express';
import {
  getHeaderLinks,
  getAllHeaderLinks,
  createHeaderLink,
  updateHeaderLink,
  deleteHeaderLink,
  reorderHeaderLinks
} from '../controllers/headerLinkController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, headerLinkSchema, headerLinkReorderSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/', getHeaderLinks);
router.get('/all', authenticate, authorize('admin'), getAllHeaderLinks);
router.post('/', authenticate, authorize('admin'), validate(headerLinkSchema), createHeaderLink);
router.put('/reorder', authenticate, authorize('admin'), validate(headerLinkReorderSchema), reorderHeaderLinks);
router.put('/:id', authenticate, authorize('admin'), validate(headerLinkSchema), updateHeaderLink);
router.delete('/:id', authenticate, authorize('admin'), deleteHeaderLink);

export default router;
