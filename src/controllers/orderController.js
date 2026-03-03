import Order from '../models/Order.js';
import Product from '../models/Product.js';
import DiscountCode from '../models/DiscountCode.js';
import { AppError } from '../utils/errors.js';
import { sendEmail } from '../config/email.js';
import { orderConfirmationTemplate } from '../utils/emailTemplates.js';
import mongoose from 'mongoose';
import { isValidObjectId, getPaginationParams } from '../utils/helpers.js';

// Helper function to restore stock when order is cancelled
const restoreOrderStock = async (order, session = null) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product).session(session);
    if (!product || !product.trackInventory) continue;

    const quantity = item.quantity;
    const selectedVariant = item.selectedVariant;

    if (selectedVariant && product.variants && product.variants.size > 0) {
      // Restore variant stock
      let stockRestored = false;
      for (const [variantType, variantArray] of product.variants.entries()) {
        const selectedVariantValue = selectedVariant[variantType]?.value;
        if (selectedVariantValue) {
          const variantIndex = variantArray.findIndex(v => v.value === selectedVariantValue);
          if (variantIndex !== -1) {
            const variantToUpdate = variantArray[variantIndex];
            if (variantToUpdate.stock !== undefined && variantToUpdate.stock !== null && !stockRestored) {
              variantToUpdate.stock += quantity;
              variantArray[variantIndex] = variantToUpdate;
              product.variants.set(variantType, variantArray);
              stockRestored = true;
            }
          }
        }
      }
      // If no variant had stock defined, restore product-level stock
      if (!stockRestored) {
        product.stock += quantity;
      }
    } else {
      // Restore product-level stock
      product.stock += quantity;
    }
    await product.save({ session });
  }
};

// Validate status transitions
const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': [], // Cannot transition from delivered
    'cancelled': [] // Cannot transition from cancelled
  };

  if (!validTransitions[currentStatus]) {
    return false;
  }

  return validTransitions[currentStatus].includes(newStatus);
};

export const getOrders = async (req, res, next) => {
  try {
    const query = { user: req.user._id };
    
    // Admin can see all orders
    if (req.user.role === 'admin') {
      delete query.user;
    }

    // Filter by status if provided
    if (req.query.status) {
      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      if (validStatuses.includes(req.query.status)) {
        query.status = req.query.status;
      }
    }

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query, 20, 100);

    const orders = await Order.find(query)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name slug images')
      .populate('discountCode', 'code type value')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    // Validate order ID
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid order ID format', 400);
    }

    const query = { _id: req.params.id };
    
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const order = await Order.findOne(query)
      .populate('items.product', 'name slug images price')
      .populate('discountCode', 'code type value')
      .populate('user', 'name email phone address');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Return order directly to match frontend expectation
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, discountCode, billingAddress, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      throw new AppError('Order must contain at least one item', 400);
    }

    // Validate all product IDs
    for (const item of items) {
      if (!isValidObjectId(item.product)) {
        throw new AppError(`Invalid product ID: ${item.product}`, 400);
      }
    }

    // Check for duplicate products in order items
    const productIds = items.map(item => item.product.toString());
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      throw new AppError('Duplicate products in order items. Please combine quantities for the same product.', 400);
    }

    // Calculate total and validate products with stock checking
    let totalAmount = 0;
    const orderItems = [];
    const productUpdates = [];

    for (const item of items) {
      // Lock product for update to prevent race conditions
      const product = await Product.findById(item.product).session(session);
      if (!product || !product.isActive) {
        throw new AppError(`Product ${item.product} not found or inactive`, 404);
      }

      let itemPrice = product.price;
      let stockToCheck = product.stock;
      let matchedVariants = [];

      // Handle variant if provided
      if (item.selectedVariant && product.variants && product.variants.size > 0) {
        // Match all variant types in the selected variant
        let totalPriceModifier = 0;
        let variantStock = null;
        
        for (const [variantType, variantArray] of product.variants.entries()) {
          const selectedVariantValue = item.selectedVariant[variantType]?.value;
          if (selectedVariantValue) {
            const variant = variantArray.find(v => v.value === selectedVariantValue);
            if (variant) {
              matchedVariants.push({ variantType, variant });
              // Accumulate price modifiers from all variant types
              totalPriceModifier += (variant.priceModifier || 0);
              // Use variant stock if available (prefer variant stock over product stock)
              if (variant.stock !== undefined && variant.stock !== null) {
                variantStock = variant.stock;
              }
            } else {
              throw new AppError(
                `Invalid variant selection: ${variantType} = ${selectedVariantValue} not found for ${product.name}`,
                400
              );
            }
          }
        }
        
        // Apply total price modifier from all variants
        itemPrice = product.price + totalPriceModifier;
        
        // Use variant stock if any variant has stock defined
        if (variantStock !== null) {
          stockToCheck = variantStock;
        }
      }

      // Check stock (product-level or variant-level)
      if (product.trackInventory && stockToCheck < item.quantity) {
        const variantDescription = matchedVariants.length > 0
          ? ` (${matchedVariants.map(v => v.variant.value).join(', ')})`
          : '';
        throw new AppError(
          `Insufficient stock for ${product.name}${variantDescription}`,
          400
        );
      }

      const finalItemPrice = itemPrice * item.quantity;
      totalAmount += finalItemPrice;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: itemPrice, // Store the final price per unit (with variant modifier)
        selectedVariant: item.selectedVariant || null
      });

      // Prepare stock update
      productUpdates.push({
        product,
        quantity: item.quantity,
        matchedVariants
      });
    }

    // Apply discount code if provided
    let discountAmount = 0;
    let discountCodeDoc = null;

    if (discountCode) {
      discountCodeDoc = await DiscountCode.findOne({ 
        code: discountCode.toUpperCase(),
        isActive: true
      }).session(session);

      if (!discountCodeDoc) {
        throw new AppError('Invalid discount code', 400);
      }

      // Check expiry
      if (discountCodeDoc.expiryDate && new Date() > discountCodeDoc.expiryDate) {
        throw new AppError('Discount code has expired', 400);
      }

      // Check max uses
      if (discountCodeDoc.maxUses && discountCodeDoc.usedCount >= discountCodeDoc.maxUses) {
        throw new AppError('Discount code has reached maximum uses', 400);
      }

      // Check min purchase
      if (totalAmount < discountCodeDoc.minPurchase) {
        throw new AppError(`Minimum purchase of Rs ${discountCodeDoc.minPurchase} required`, 400);
      }

      // Calculate discount
      if (discountCodeDoc.type === 'percentage') {
        discountAmount = (totalAmount * discountCodeDoc.value) / 100;
      } else {
        discountAmount = discountCodeDoc.value;
      }
    }

    // Ensure discount doesn't exceed total amount
    const finalAmount = Math.max(0, totalAmount - discountAmount);
    
    // Calculate delivery charges
    let deliveryChargesAmount = 0;
    if (req.body.deliveryCharges !== undefined) {
      deliveryChargesAmount = req.body.deliveryCharges;
    }

    // Create order within transaction
    const createdOrder = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount: finalAmount + deliveryChargesAmount,
      discountCode: discountCodeDoc?._id,
      discountAmount,
      deliveryCharges: deliveryChargesAmount,
      billingAddress: billingAddress || {
        street: req.user.address?.street || '',
        city: req.user.address?.city || '',
        state: req.user.address?.state || '',
        zipCode: req.user.address?.zipCode || '',
        country: req.user.address?.country || '',
        phone: req.user.phone || '',
        email: req.user.email || '',
        firstName: req.user.name?.split(' ')[0] || '',
        lastName: req.user.name?.split(' ').slice(1).join(' ') || '',
      },
      shippingAddress: shippingAddress || billingAddress || {
        street: req.user.address?.street || '',
        city: req.user.address?.city || '',
        state: req.user.address?.state || '',
        zipCode: req.user.address?.zipCode || '',
        country: req.user.address?.country || '',
        phone: req.user.phone || '',
        email: req.user.email || '',
        firstName: req.user.name?.split(' ')[0] || '',
        lastName: req.user.name?.split(' ').slice(1).join(' ') || '',
      }
    });
    await createdOrder.save({ session });

    // Update product and variant stock within transaction
    for (const { product, quantity, matchedVariants } of productUpdates) {
      if (product.trackInventory) {
        if (matchedVariants && matchedVariants.length > 0) {
          // Update variant stock for all matched variants
          // Note: We update stock for the first variant that has stock defined
          // In a more complex system, you might want to track stock per variant combination
          let stockUpdated = false;
          for (const { variantType, variant } of matchedVariants) {
            const variantArray = product.variants.get(variantType);
            if (variantArray) {
              const variantIndex = variantArray.findIndex(
                v => v.value === variant.value
              );
              if (variantIndex !== -1) {
                const variantToUpdate = variantArray[variantIndex];
                if (variantToUpdate.stock !== undefined && variantToUpdate.stock !== null && !stockUpdated) {
                  variantToUpdate.stock -= quantity;
                  variantArray[variantIndex] = variantToUpdate;
                  product.variants.set(variantType, variantArray);
                  stockUpdated = true;
                }
              }
            }
          }
          // If no variant had stock defined, update product-level stock
          if (!stockUpdated) {
            product.stock -= quantity;
          }
        } else {
          // Update product-level stock
          product.stock -= quantity;
        }
        await product.save({ session });
      }
    }

    // Update discount code usage only after successful order creation
    if (discountCodeDoc) {
      discountCodeDoc.usedCount += 1;
      await discountCodeDoc.save({ session });
    }

    // Commit transaction
    await session.commitTransaction();

    // Send confirmation email (outside transaction)
    try {
      await createdOrder.populate('user', 'email name phone address');
      await sendEmail(
        createdOrder.user.email,
        'Order Confirmation',
        orderConfirmationTemplate(createdOrder)
      );
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
    }

    await createdOrder.populate('items.product', 'name slug images');

    res.status(201).json({
      success: true,
      order: createdOrder
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error('Error aborting transaction:', abortError);
    }
    next(error);
  } finally {
    try {
      session.endSession();
    } catch (endError) {
      console.error('Error ending session:', endError);
    }
  }
};

export const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate order ID
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid order ID format', 400);
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id // Users can only cancel their own orders
    }).session(session);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check if order can be cancelled (only pending or confirmed orders)
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new AppError(
        `Order cannot be cancelled. Only orders with status 'pending' or 'confirmed' can be cancelled. Current status: ${order.status}`,
        400
      );
    }

    // Restore stock
    await restoreOrderStock(order, session);

    // Restore discount code usage count
    if (order.discountCode) {
      const discountCodeDoc = await DiscountCode.findById(order.discountCode).session(session);
      if (discountCodeDoc && discountCodeDoc.usedCount > 0) {
        discountCodeDoc.usedCount -= 1;
        await discountCodeDoc.save({ session });
      }
    }

    // Update order status
    order.status = 'cancelled';
    await order.save({ session });

    await session.commitTransaction();

    // Populate order for response
    await order.populate('items.product', 'name slug images price');
    await order.populate('discountCode', 'code type value');

    res.json({
      success: true,
      order
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error('Error aborting transaction:', abortError);
    }
    next(error);
  } finally {
    try {
      session.endSession();
    } catch (endError) {
      console.error('Error ending session:', endError);
    }
  }
};

export const updateOrderStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;

    // Validate status enum
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Validate order ID
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid order ID format', 400);
    }

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Validate status transition
    if (!validateStatusTransition(order.status, status)) {
      throw new AppError(
        `Invalid status transition from ${order.status} to ${status}`,
        400
      );
    }

    const previousStatus = order.status;
    const isCancelling = status === 'cancelled' && previousStatus !== 'cancelled';
    const wasCancelled = previousStatus === 'cancelled' && status !== 'cancelled';

    // If cancelling, restore stock and discount code usage
    if (isCancelling) {
      await restoreOrderStock(order, session);
      
      // Restore discount code usage count
      if (order.discountCode) {
        const discountCodeDoc = await DiscountCode.findById(order.discountCode).session(session);
        if (discountCodeDoc && discountCodeDoc.usedCount > 0) {
          discountCodeDoc.usedCount -= 1;
          await discountCodeDoc.save({ session });
        }
      }
    }

    // If uncancelling (shouldn't normally happen, but handle it)
    if (wasCancelled) {
      // Re-apply stock deduction (validate stock availability first)
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product || !product.trackInventory) continue;

        let stockToCheck = product.stock;
        const selectedVariant = item.selectedVariant;

        if (selectedVariant && product.variants && product.variants.size > 0) {
          for (const [variantType, variantArray] of product.variants.entries()) {
            const selectedVariantValue = selectedVariant[variantType]?.value;
            if (selectedVariantValue) {
              const variant = variantArray.find(v => v.value === selectedVariantValue);
              if (variant && variant.stock !== undefined && variant.stock !== null) {
                stockToCheck = variant.stock;
                break;
              }
            }
          }
        }

        if (stockToCheck < item.quantity) {
          throw new AppError(
            `Insufficient stock to uncancel order. Product ${product.name} has only ${stockToCheck} items available.`,
            400
          );
        }
      }

      // Deduct stock again
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product || !product.trackInventory) continue;

        const quantity = item.quantity;
        const selectedVariant = item.selectedVariant;

        if (selectedVariant && product.variants && product.variants.size > 0) {
          let stockUpdated = false;
          for (const [variantType, variantArray] of product.variants.entries()) {
            const selectedVariantValue = selectedVariant[variantType]?.value;
            if (selectedVariantValue) {
              const variantIndex = variantArray.findIndex(v => v.value === selectedVariantValue);
              if (variantIndex !== -1) {
                const variantToUpdate = variantArray[variantIndex];
                if (variantToUpdate.stock !== undefined && variantToUpdate.stock !== null && !stockUpdated) {
                  variantToUpdate.stock -= quantity;
                  variantArray[variantIndex] = variantToUpdate;
                  product.variants.set(variantType, variantArray);
                  stockUpdated = true;
                }
              }
            }
          }
          if (!stockUpdated) {
            product.stock -= quantity;
          }
        } else {
          product.stock -= quantity;
        }
        await product.save({ session });
      }

      // Re-increment discount code usage
      if (order.discountCode) {
        const discountCodeDoc = await DiscountCode.findById(order.discountCode).session(session);
        if (discountCodeDoc) {
          discountCodeDoc.usedCount += 1;
          await discountCodeDoc.save({ session });
        }
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();

    // Populate order for response
    await order.populate('items.product', 'name slug images price');
    await order.populate('discountCode', 'code type value');
    await order.populate('user', 'name email phone address');

    res.json({
      success: true,
      order
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error('Error aborting transaction:', abortError);
    }
    next(error);
  } finally {
    try {
      session.endSession();
    } catch (endError) {
      console.error('Error ending session:', endError);
    }
  }
};
