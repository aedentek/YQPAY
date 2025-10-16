const express = require('express');
const { body, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const TheaterOrders = require('../models/TheaterOrders');  // ✅ New array-based model
const Product = require('../models/Product');
const { authenticateToken, optionalAuth, requireTheaterAccess } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/orders/theater
 * Create a new order for a theater
 */
router.post('/theater', [
  optionalAuth,
  body('theaterId').isMongoId().withMessage('Valid theater ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    console.log('\n🎯 ===== ORDER CREATION REQUEST =====');
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Theater ID:', req.body.theaterId);
    console.log('🔍 Customer Name:', req.body.customerName);
    console.log('🔍 Payment Method:', req.body.paymentMethod);
    console.log('🔍 Items Count:', req.body.items?.length);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation Errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { theaterId, items, customerInfo, customerName, tableNumber, specialInstructions, orderNotes, paymentMethod } = req.body;

    // Handle both customerInfo and customerName formats
    const finalCustomerInfo = customerInfo || {
      name: customerName || 'Walk-in Customer'
    };

    // Handle both specialInstructions and orderNotes
    const finalSpecialInstructions = specialInstructions || orderNotes || '';

    // Validate products and calculate pricing
    let subtotal = 0;
    const orderItems = [];

    // Fetch products from productlist collection (array structure)
    const db = mongoose.connection.db;
    const theaterIdObjectId = new mongoose.Types.ObjectId(theaterId);
    
    const productContainer = await db.collection('productlist').findOne({
      theater: theaterIdObjectId,
      productList: { $exists: true }
    });

    if (!productContainer || !productContainer.productList) {
      return res.status(400).json({
        error: 'No products found for this theater',
        code: 'NO_PRODUCTS'
      });
    }

    for (const item of items) {
      const productObjectId = new mongoose.Types.ObjectId(item.productId);
      
      // Find product in the productList array
      const product = productContainer.productList.find(p => 
        p._id.equals(productObjectId)
      );

      if (!product) {
        return res.status(400).json({
          error: `Invalid product: ${item.productId}`,
          code: 'INVALID_PRODUCT'
        });
      }

      // Check if product is active
      if (!product.isActive || !product.isAvailable) {
        return res.status(400).json({
          error: `Product "${product.name}" is not available`,
          code: 'PRODUCT_UNAVAILABLE'
        });
      }

      // Check stock (use array structure fields)
      const currentStock = product.inventory?.currentStock ?? 0;
      const trackStock = product.inventory?.trackStock ?? true;
      
      if (trackStock && currentStock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}`,
          code: 'INSUFFICIENT_STOCK'
        });
      }

      // Get price from array structure
      const unitPrice = product.pricing?.basePrice ?? product.sellingPrice ?? 0;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        variants: item.variants || []
      });

      // Update stock in the array
      if (trackStock) {
        const newStock = currentStock - item.quantity;
        
        await db.collection('productlist').updateOne(
          {
            theater: theaterIdObjectId,
            'productList._id': productObjectId
          },
          {
            $set: {
              'productList.$.inventory.currentStock': newStock,
              'productList.$.updatedAt': new Date()
            }
          }
        );
      }
    }

    // Calculate taxes and total
    const taxRate = 0.18; // 18% GST
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    console.log('💰 Order Totals:', { subtotal, taxAmount, total });
    console.log('📝 Creating order with data:', {
      theaterId,
      customerInfo: finalCustomerInfo,
      itemsCount: orderItems.length,
      payment: { method: paymentMethod || 'cash', status: 'pending' },
      source: req.user ? 'staff' : 'qr_code',
      staffUsername: req.user?.username || 'anonymous'
    });
    
    // 🔍 DEBUG: Check what's in req.user
    console.log('🔍 DEBUG req.user:', JSON.stringify(req.user, null, 2));

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get today's orders count for this theater
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const theaterOrders = await TheaterOrders.findOne({ theater: theaterId });
    let todayOrdersCount = 0;
    
    if (theaterOrders) {
      todayOrdersCount = theaterOrders.orderList.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      }).length;
    }
    
    const orderNumber = `ORD-${dateStr}-${(todayOrdersCount + 1).toString().padStart(4, '0')}`;
    console.log('📝 Generated orderNumber:', orderNumber);

    // Create staff info object
    let staffInfo = null;
    if (req.user) {
      staffInfo = {
        staffId: req.user.userId,
        username: req.user.username,
        role: req.user.role
      };
      console.log('👤 Staff Info Created:', staffInfo);
    } else {
      console.log('⚠️ No req.user found - order will have null staffInfo');
    }

    // Create order object for array
    const newOrder = {
      orderNumber,
      customerInfo: finalCustomerInfo,
      items: orderItems,
      pricing: {
        subtotal,
        taxAmount,
        total,
        currency: 'INR'
      },
      payment: {
        method: paymentMethod || 'cash',
        status: 'pending'
      },
      status: 'pending',  // ✅ Default status
      orderType: 'dine_in',
      staffInfo: staffInfo,  // ✅ Use the created staffInfo object
      source: req.user ? 'staff' : 'qr_code',
      tableNumber,
      specialInstructions: finalSpecialInstructions,
      timestamps: {
        placedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Saving order to array-based structure...');
    
    // Use findOneAndUpdate with $push to add order to array
    const updatedTheaterOrders = await TheaterOrders.findOneAndUpdate(
      { theater: theaterId },
      {
        $push: { orderList: newOrder },
        $inc: {
          'metadata.totalOrders': 1,
          'metadata.pendingOrders': 1,
          'metadata.totalRevenue': total
        },
        $set: {
          'metadata.lastOrderDate': new Date(),
          updatedAt: new Date()
        }
      },
      {
        upsert: true,  // Create if doesn't exist
        new: true,
        runValidators: true
      }
    );

    // Get the saved order (last item in array)
    const savedOrder = updatedTheaterOrders.orderList[updatedTheaterOrders.orderList.length - 1];
    
    console.log('✅ Order saved successfully! Order Number:', savedOrder.orderNumber);
    console.log('👤 Staff:', savedOrder.staffInfo?.username || 'anonymous');
    console.log('📊 Status:', savedOrder.status);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder  // ✅ Changed from 'data' to 'order' to match frontend
    });

  } catch (error) {
    console.error('\n❌ ===== ORDER CREATION ERROR =====');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    if (error.errors) {
      console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
    }
    console.error('Full Error:', error);
    console.error('=====================================\n');
    
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message,
      details: error.errors || {}
    });
  }
});

/**
 * GET /api/orders/my-orders
 * Get orders for the current user
 */
router.get('/my-orders', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.user.role === 'theater_staff' || req.user.role === 'theater_admin') {
      query.theaterId = req.user.theaterId;
    } else if (req.user.role === 'customer') {
      query.customerId = req.user.userId;
    } else if (req.user.role === 'super_admin') {
      // Super admin can see all orders, no additional filter
    }

    const orders = await Order.find(query)
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/orders/theater-nested
 * Get nested order data for a theater
 */
router.get('/theater-nested', [
  authenticateToken,
  query('theaterId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let theaterId = req.query.theaterId;
    
    // If no theaterId provided, use user's theater
    if (!theaterId && req.user.theaterId) {
      theaterId = req.user.theaterId;
    }

    if (!theaterId) {
      return res.status(400).json({
        error: 'Theater ID is required',
        code: 'THEATER_ID_REQUIRED'
      });
    }

    const orders = await Order.find({ theaterId })
      .populate('items.productId', 'name images')
      .populate('customerId', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ theaterId });

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get theater orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch theater orders',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/orders/theater-stats
 * Get order statistics for a theater
 */
router.get('/theater-stats', [
  authenticateToken,
  query('theaterId').optional().isMongoId()
], async (req, res) => {
  try {
    let theaterId = req.query.theaterId;
    
    if (!theaterId && req.user.theaterId) {
      theaterId = req.user.theaterId;
    }

    if (!theaterId) {
      return res.status(400).json({
        error: 'Theater ID is required',
        code: 'THEATER_ID_REQUIRED'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      completedOrders,
      pendingOrders,
      todayRevenue,
      totalRevenue
    ] = await Promise.all([
      Order.countDocuments({ theaterId }),
      Order.countDocuments({ theaterId, createdAt: { $gte: today } }),
      Order.countDocuments({ theaterId, status: 'completed' }),
      Order.countDocuments({ theaterId, status: { $in: ['pending', 'confirmed', 'preparing'] } }),
      Order.aggregate([
        {
          $match: {
            theaterId: new require('mongoose').Types.ObjectId(theaterId),
            createdAt: { $gte: today },
            'payment.status': 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.total' }
          }
        }
      ]),
      Order.aggregate([
        {
          $match: {
            theaterId: new require('mongoose').Types.ObjectId(theaterId),
            'payment.status': 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.total' }
          }
        }
      ])
    ]);

    const stats = {
      orders: {
        total: totalOrders,
        today: todayOrders,
        completed: completedOrders,
        pending: pendingOrders
      },
      revenue: {
        today: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
        total: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        currency: 'INR'
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get theater stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch theater statistics',
      message: 'Internal server error'
    });
  }
});

/**
 * PUT /api/orders/:orderId/status
 * Update order status
 */
router.put('/:orderId/status', [
  authenticateToken,
  body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled', 'completed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // Check authorization
    if (req.user.role !== 'super_admin' && req.user.theaterId !== order.theaterId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    await order.updateStatus(req.body.status);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order._id,
        status: order.status,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Failed to update order status',
      message: 'Internal server error'
    });
  }
});

module.exports = router;