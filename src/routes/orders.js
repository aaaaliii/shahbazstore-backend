import express from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, orderSchema, orderStatusSchema } from '../utils/validators.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', validate(orderSchema), createOrder);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', authorize('admin'), validate(orderStatusSchema), updateOrderStatus);

export default router;
