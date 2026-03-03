import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
  getPopularProducts,
  getShareData,
  getProductsForComparison,
  getProductByBarcode,
  getProductCollections
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, productSchema } from '../utils/validators.js';
import upload from '../config/multer.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/collections', getProductCollections);
router.get('/popular', getPopularProducts);
router.get('/compare', getProductsForComparison);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProducts);
router.get('/:id/share-data', getShareData);
router.post('/', authenticate, authorize('admin'), upload.array('images', 5), validate(productSchema), createProduct);
router.put('/:id', authenticate, authorize('admin'), upload.array('images', 5), validate(productSchema), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), deleteProduct);

export default router;
