import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  getRecentlyViewed,
  addToRecentlyViewed
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, profileUpdateSchema, recentlyViewedSchema } from '../utils/validators.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(profileUpdateSchema), updateProfile);
router.get('/recently-viewed', authenticate, getRecentlyViewed);
router.post('/recently-viewed', authenticate, validate(recentlyViewedSchema), addToRecentlyViewed);

export default router;
