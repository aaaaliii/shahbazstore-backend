import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const validateObjectId = (id, fieldName = 'ID') => {
  if (!isValidObjectId(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  return true;
};

// Safe number conversion with validation
export const safeNumber = (value, defaultValue = null, min = null, max = null) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  if (min !== null && num < min) return defaultValue;
  if (max !== null && num > max) return defaultValue;
  return num;
};

// Safe pagination helper
export const getPaginationParams = (query, defaultLimit = 12, maxLimit = 100) => {
  const page = Math.max(1, safeNumber(query.page, 1, 1));
  const limit = Math.min(maxLimit, Math.max(1, safeNumber(query.limit, defaultLimit, 1, maxLimit)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
