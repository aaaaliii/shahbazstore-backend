import express from 'express';
import upload from '../config/multer.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { uploadToBlob, uploadMultipleToBlob } from '../utils/blobStorage.js';

const router = express.Router();

// Single image upload endpoint
router.post('/product-image', authenticate, authorize('admin'), (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Upload to Vercel Blob
      const blobResult = await uploadToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.fieldname
      );

      res.json({
        success: true,
        image: blobResult.url, // Full URL for storage in DB
        url: blobResult.url, // Full URL for display
        publicId: blobResult.pathname // Pathname for reference
      });
    } catch (uploadError) {
      return next(new AppError(`Failed to upload image: ${uploadError.message}`, 500));
    }
  });
});

// Multiple images upload endpoint
router.post('/product-images', authenticate, authorize('admin'), (req, res, next) => {
  // Allow up to 10 images at once
  upload.array('images', 10)(req, res, async (err) => {
    if (err) {
      return next(err);
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    try {
      // Upload all files to Vercel Blob
      const filesToUpload = req.files.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        fieldname: file.fieldname
      }));

      const uploadedImages = await uploadMultipleToBlob(filesToUpload);

      res.json({
        success: true,
        images: uploadedImages.map(blob => ({
          image: blob.url, // Full URL for storage in DB
          url: blob.url, // Full URL for display
          publicId: blob.pathname // Pathname for reference
        }))
      });
    } catch (uploadError) {
      return next(new AppError(`Failed to upload images: ${uploadError.message}`, 500));
    }
  });
});

export default router;
