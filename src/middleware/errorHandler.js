import { AppError } from '../utils/errors.js';
import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      err = new AppError('File too large. Maximum file size is 5MB', 400);
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      err = new AppError('Too many files. Maximum 5 files allowed', 400);
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      err = new AppError('Unexpected file field', 400);
    } else {
      err = new AppError(`File upload error: ${err.message}`, 400);
    }
  }

  // Handle other file upload errors
  if (err.message && err.message.includes('Only image files are allowed')) {
    err = new AppError('Only image files (jpeg, jpg, png, gif, webp) are allowed', 400);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      ...(err.isOperational && {
        statusCode: err.statusCode,
        isOperational: err.isOperational
      })
    });
  } else {
    // Production
    if (err.isOperational) {
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message
      });
    } else {
      console.error('ERROR 💥', err);
      // For upload-related errors, include the message even in production for better UX
      const isUploadError = err.message && (
        err.message.includes('upload') || 
        err.message.includes('blob') || 
        err.message.includes('file') ||
        err.message.includes('BLOB_READ_WRITE_TOKEN')
      );
      
      res.status(500).json({
        success: false,
        status: 'error',
        message: isUploadError ? err.message : 'Something went wrong!',
        // Include error field for frontend compatibility
        error: isUploadError ? err.message : 'Something went wrong!'
      });
    }
  }
};
