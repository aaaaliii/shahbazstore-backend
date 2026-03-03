import Analytics from '../models/Analytics.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId, safeNumber } from '../utils/helpers.js';
import { validateQueryParams } from '../utils/validators.js';

export const trackEvent = async (req, res, next) => {
  try {
    const { eventType, productId, categoryId, metadata } = req.body;

    if (!eventType) {
      throw new AppError('Event type is required', 400);
    }

    // Validate eventType
    const validEventTypes = ['page_view', 'product_view', 'add_to_cart', 'purchase', 'search'];
    if (!validEventTypes.includes(eventType)) {
      throw new AppError(`Invalid event type. Must be one of: ${validEventTypes.join(', ')}`, 400);
    }

    // Validate productId if provided
    if (productId && !isValidObjectId(productId)) {
      throw new AppError('Invalid product ID format', 400);
    }

    // Validate categoryId if provided
    if (categoryId && !isValidObjectId(categoryId)) {
      throw new AppError('Invalid category ID format', 400);
    }

    const analytics = await Analytics.create({
      eventType,
      product: productId || null,
      category: categoryId || null,
      user: req.user?._id || null,
      metadata: metadata || null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      analytics
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularProducts = async (req, res, next) => {
  try {
    const validatedDays = validateQueryParams.days(req.query.days, 30, 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validatedDays);

    const popularProducts = await Analytics.aggregate([
      {
        $match: {
          eventType: 'product_view',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$product',
          viewCount: { $sum: 1 }
        }
      },
      {
        $sort: { viewCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          slug: '$product.slug',
          price: '$product.price',
          images: '$product.images',
          averageRating: '$product.averageRating',
          viewCount: 1
        }
      }
    ]);

    res.json({
      success: true,
      products: popularProducts
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      revenueResult,
      recentOrders,
      lowStockProducts
    ] = await Promise.all([
      // Count total products
      Product.countDocuments(),
      // Count active products
      Product.countDocuments({ isActive: true }),
      // Count total orders
      Order.countDocuments(),
      // Count pending orders
      Order.countDocuments({ status: 'pending' }),
      // Count confirmed orders
      Order.countDocuments({ status: 'confirmed' }),
      // Calculate total revenue (sum of totalAmount from delivered orders only)
      Order.aggregate([
        {
          $match: {
            status: 'delivered'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]),
      // Get recent orders (last 10) with populated user info
      Order.find()
        .populate('user', 'name email phone')
        .populate('items.product', 'name slug images')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // Get low stock products (stock <= lowStockThreshold)
      Product.find({
        trackInventory: true,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        isActive: true
      })
        .select('name slug stock lowStockThreshold images')
        .limit(10)
        .lean()
    ]);

    // Extract revenue from aggregation result
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Transform recent orders to match frontend expectations
    const transformedRecentOrders = recentOrders.map(order => ({
      _id: order._id,
      id: order._id,
      customerName: order.user?.name || 'N/A',
      customerEmail: order.user?.email || 'N/A',
      customerPhone: order.user?.phone,
      items: order.items.map(item => ({
        productId: item.product?._id || item.product,
        productName: item.product?.name || '',
        productImage: item.product?.images?.[0] || '',
        quantity: item.quantity,
        price: item.price
      })),
      total: order.totalAmount,
      subtotal: order.totalAmount - (order.discountAmount || 0),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        totalRevenue,
        recentOrders: transformedRecentOrders,
        lowStockProducts: lowStockProducts.map(p => ({
          _id: p._id,
          id: p._id,
          name: p.name,
          slug: p.slug,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          image: p.images?.[0] || ''
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
