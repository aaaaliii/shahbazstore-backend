import express from 'express';
import upload from '../config/multer.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';

const router = express.Router();

// Single image upload endpoint
router.post('/product-image', authenticate, authorize('admin'), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const imagePath = `/uploads/products/${req.file.filename}`;
    const baseUrl = req.protocol + '://' + req.get('host');
    const fullUrl = `${baseUrl}${imagePath}`;

    res.json({
      success: true,
      image: imagePath, // Path for storage in DB
      url: fullUrl, // Full URL for display
      publicId: imagePath // Alias for path
    });
  });
});

// Multiple images upload endpoint
router.post('/product-images', authenticate, authorize('admin'), (req, res, next) => {
  // Allow up to 10 images at once
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      return next(err);
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const uploadedImages = req.files.map(file => {
      const imagePath = `/uploads/products/${file.filename}`;
      const fullUrl = `${baseUrl}${imagePath}`;
      return {
        image: imagePath, // Path for storage in DB
        url: fullUrl, // Full URL for display
        publicId: imagePath // Alias for path
      };
    });

    res.json({
      success: true,
      images: uploadedImages
    });
  });
});

export default router;
