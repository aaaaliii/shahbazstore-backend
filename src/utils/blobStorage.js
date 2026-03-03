import { put } from '@vercel/blob';
import path from 'path';

/**
 * Upload a file buffer to Vercel Blob Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Original filename
 * @param {string} fieldname - Field name from form
 * @param {string} folder - Folder path in blob storage (default: 'products')
 * @returns {Promise<{url: string, pathname: string}>}
 */
export const uploadToBlob = async (buffer, originalname, fieldname = 'file', folder = 'products') => {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is available
    // On Vercel, this is automatically provided
    // For local development, you need to set it in .env
    if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL !== '1') {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required. Please set it in your .env file for local development.');
    }

    // On Vercel, check if token is available (it should be auto-provided)
    if (process.env.VERCEL === '1' && !process.env.BLOB_READ_WRITE_TOKEN) {
      const errorMsg = 'BLOB_READ_WRITE_TOKEN is missing. Please configure it in Vercel environment variables.';
      console.error('ERROR:', errorMsg);
      throw new Error(errorMsg);
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalname);
    const filename = `${fieldname}-${uniqueSuffix}${ext}`;
    const pathname = `${folder}/${filename}`;

    console.log('Attempting to upload to Vercel Blob:', {
      pathname,
      size: buffer.length,
      contentType: getContentType(ext),
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
    });

    // Upload to Vercel Blob with public access
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: getContentType(ext),
    });

    console.log('Successfully uploaded to Vercel Blob:', blob.url);

    return {
      url: blob.url,
      pathname: blob.pathname,
      // For backward compatibility, also return as image path
      image: blob.url,
      publicId: blob.pathname,
    };
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      folder,
      filename: originalname,
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isVercel: process.env.VERCEL === '1'
    });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Get content type based on file extension
 * @param {string} ext - File extension
 * @returns {string} Content type
 */
const getContentType = (ext) => {
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Upload multiple files to Vercel Blob Storage
 * @param {Array<{buffer: Buffer, originalname: string, fieldname: string}>} files
 * @returns {Promise<Array<{url: string, pathname: string, image: string, publicId: string}>>}
 */
export const uploadMultipleToBlob = async (files) => {
  try {
    const uploadPromises = files.map(file =>
      uploadToBlob(file.buffer, file.originalname, file.fieldname)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files to Vercel Blob:', error);
    throw new Error(`Failed to upload files: ${error.message}`);
  }
};
