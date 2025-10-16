const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { 
  authenticateToken, 
  requirePageAccess,
  requireTheaterAdminRole,
  getUserDataScope
} = require('../middleware/auth');

/**
 * ✅ GET /api/reports/full-report/:theaterId
 * Download complete theater report (Theater Admin ONLY)
 */
router.get('/full-report/:theaterId',
  authenticateToken,
  requireTheaterAdminRole,
  requirePageAccess('TheaterReports'),
  async (req, res) => {
    try {
      const { theaterId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      console.log(`📊 Theater Admin downloading FULL report for theater: ${theaterId}`);

      // Build query - NO FILTERS (all data)
      const query = {
        theater: new mongoose.Types.ObjectId(theaterId)
      };

      // Optional date range from query params
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
          console.log(`   - Start date: ${startDate}`);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
          console.log(`   - End date: ${endDate}`);
        }
      }

      console.log('🔍 Query:', JSON.stringify(query, null, 2));

      // Fetch ALL orders for the theater
      const orders = await mongoose.connection.db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      console.log(`✅ Found ${orders.length} total orders`);

      // Calculate complete statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Group by status
      const statusBreakdown = orders.reduce((acc, order) => {
        const status = order.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Group by category
      const categoryBreakdown = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const category = item.categoryName || item.category || 'Uncategorized';
            if (!categoryBreakdown[category]) {
              categoryBreakdown[category] = {
                count: 0,
                revenue: 0,
                items: 0
              };
            }
            categoryBreakdown[category].count += 1;
            categoryBreakdown[category].revenue += (item.price * item.quantity) || 0;
            categoryBreakdown[category].items += item.quantity || 0;
          });
        }
      });

      // Prepare full report data
      const reportData = {
        reportType: 'FULL_REPORT',
        generatedBy: req.user.username || req.user.userId,
        generatedAt: new Date(),
        theater: theaterId,
        dateRange: { startDate, endDate },
        summary: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          statusBreakdown,
          categoryBreakdown
        },
        orders: orders
      };

      // ✅ Log access for audit
      await mongoose.connection.db.collection('report_access_logs').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        username: req.user.username,
        role: 'Theater Admin',
        reportType: 'FULL_REPORT',
        theaterId: new mongoose.Types.ObjectId(theaterId),
        filters: query,
        recordsAccessed: orders.length,
        totalRevenue: totalRevenue,
        accessedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Return based on format
      if (format === 'csv') {
        const csv = generateCSV(orders, 'FULL REPORT', req.user.username);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="full_report_${theaterId}_${Date.now()}.csv"`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      console.error('❌ Error generating full report:', error);
      res.status(500).json({
        error: 'Failed to generate full report',
        message: error.message
      });
    }
  }
);

/**
 * ✅ GET /api/reports/my-sales/:theaterId
 * Download user-specific sales report (filtered by user assignments)
 */
router.get('/my-sales/:theaterId',
  authenticateToken,
  requirePageAccess('TheaterReports'),
  async (req, res) => {
    try {
      const { theaterId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      // ✅ Get USER-SPECIFIC data access scope
      const dataScope = await getUserDataScope(req.user.userId);

      if (!dataScope.hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'NO_DATA_ACCESS'
        });
      }

      console.log(`📊 User ${dataScope.scope.userName} downloading report. Type: ${dataScope.scope.type}`);

      // Build query with USER-SPECIFIC filters
      const query = {
        theater: new mongoose.Types.ObjectId(theaterId)
      };

      // ✅ Apply USER-SPECIFIC filters (not just role-based)
      if (dataScope.scope.type === 'user_specific') {
        const filters = dataScope.scope.filters;
        const userId = dataScope.scope.userId;

        console.log(`🔒 Applying USER-SPECIFIC filters for user: ${userId}`);

        // ✅ Filter by user's assigned categories
        if (filters.assignedCategories && filters.assignedCategories.length > 0) {
          query['items.category'] = { 
            $in: filters.assignedCategories.map(id => 
              mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
            )
          };
          console.log(`   - Filtering by assigned categories: ${filters.assignedCategories.length} categories`);
        }

        // ✅ Filter by user's assigned products
        if (filters.assignedProducts && filters.assignedProducts.length > 0) {
          query['items.productId'] = { 
            $in: filters.assignedProducts.map(id => new mongoose.Types.ObjectId(id))
          };
          console.log(`   - Filtering by assigned products: ${filters.assignedProducts.length} products`);
        }

        // ✅ Filter by user's assigned sections
        if (filters.assignedSections && filters.assignedSections.length > 0) {
          query.section = { $in: filters.assignedSections };
          console.log(`   - Filtering by assigned sections: ${filters.assignedSections.join(', ')}`);
        }

        // ✅ Filter by who processed the order
        if (filters.trackByProcessor) {
          query.processedBy = new mongoose.Types.ObjectId(userId);
          console.log(`   - Filtering by processor: only orders processed by this user`);
        }

        // ✅ Filter by user's date range restriction
        if (filters.accessStartDate && filters.accessEndDate) {
          query.createdAt = {
            $gte: new Date(filters.accessStartDate),
            $lte: new Date(filters.accessEndDate)
          };
          console.log(`   - Filtering by date range: ${filters.accessStartDate} to ${filters.accessEndDate}`);
        }

      } else if (dataScope.scope.type === 'full') {
        // Theater Admin - no filters
        console.log('✅ Theater Admin - Full access (no filters)');
      }

      // Optional additional date range from query params
      if (startDate || endDate) {
        if (!query.createdAt) query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      console.log('🔍 Final query:', JSON.stringify(query, null, 2));

      // ✅ Fetch USER-SPECIFIC filtered orders
      const orders = await mongoose.connection.db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      console.log(`✅ Found ${orders.length} orders for user ${dataScope.scope.userName || 'Unknown'}`);

      // Calculate USER-SPECIFIC statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Group by category
      const categoryBreakdown = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const category = item.categoryName || item.category || 'Uncategorized';
            if (!categoryBreakdown[category]) {
              categoryBreakdown[category] = {
                count: 0,
                revenue: 0,
                items: 0
              };
            }
            categoryBreakdown[category].count += 1;
            categoryBreakdown[category].revenue += (item.price * item.quantity) || 0;
            categoryBreakdown[category].items += item.quantity || 0;
          });
        }
      });

      // Prepare USER-SPECIFIC report data
      const reportData = {
        reportType: dataScope.scope.type === 'full' ? 'FULL_REPORT' : 'USER_SPECIFIC_REPORT',
        generatedBy: req.user.username || req.user.userId,
        generatedAt: new Date(),
        theater: theaterId,
        userId: dataScope.scope.userId,
        userName: dataScope.scope.userName,
        userEmail: dataScope.scope.userEmail,
        appliedFilters: dataScope.scope.filters || {},
        dataAccessType: dataScope.scope.type,
        dateRange: { startDate, endDate },
        summary: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          completedOrders: orders.filter(o => o.status === 'completed').length,
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          categoryBreakdown
        },
        orders: orders
      };

      // ✅ Log access for audit
      await mongoose.connection.db.collection('report_access_logs').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        username: req.user.username,
        role: dataScope.scope.type,
        reportType: dataScope.scope.type === 'full' ? 'FULL_REPORT' : 'USER_SPECIFIC_REPORT',
        theaterId: new mongoose.Types.ObjectId(theaterId),
        filters: query,
        recordsAccessed: orders.length,
        totalRevenue: totalRevenue,
        accessedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Return based on format
      if (format === 'csv') {
        const csv = generateCSV(orders, dataScope.scope.userName || 'User Report', req.user.username);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sales_report_${dataScope.scope.userName}_${Date.now()}.csv"`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      console.error('❌ Error generating report:', error);
      res.status(500).json({
        error: 'Failed to generate report',
        message: error.message
      });
    }
  }
);

/**
 * ✅ GET /api/reports/my-stats/:theaterId
 * Get user-specific statistics (for dashboard display)
 */
router.get('/my-stats/:theaterId',
  authenticateToken,
  requirePageAccess('TheaterReports'),
  async (req, res) => {
    try {
      const { theaterId } = req.params;
      const dataScope = await getUserDataScope(req.user.userId);

      if (!dataScope.hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'NO_DATA_ACCESS'
        });
      }

      // Build query with user-specific filters
      const query = {
        theater: new mongoose.Types.ObjectId(theaterId)
      };

      if (dataScope.scope.type === 'user_specific' && dataScope.scope.filters) {
        const filters = dataScope.scope.filters;

        if (filters.assignedCategories && filters.assignedCategories.length > 0) {
          query['items.category'] = { 
            $in: filters.assignedCategories.map(id => 
              mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
            )
          };
        }
      }

      const orders = await mongoose.connection.db.collection('orders')
        .find(query)
        .toArray();

      // Get unique categories from user's orders
      const categories = new Set();
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            if (item.categoryName || item.category) {
              categories.add(item.categoryName || item.category);
            }
          });
        }
      });

      const stats = {
        myOrders: orders.length,
        myRevenue: orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0),
        myCategories: Array.from(categories)
      };

      res.json({
        success: true,
        stats: stats
      });

    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      res.status(500).json({
        error: 'Failed to fetch stats',
        message: error.message
      });
    }
  }
);

/**
 * ✅ CSV Generator
 */
function generateCSV(orders, reportName, generatedBy) {
  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Items',
    'Category',
    'Total',
    'Status',
    'Payment Method'
  ];

  const rows = orders.map(order => [
    order._id.toString(),
    new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    order.customerInfo?.name || order.customerInfo?.phone || 'Guest',
    order.items?.map(i => `${i.name} (${i.quantity})`).join('; ') || 'N/A',
    order.items?.map(i => i.categoryName || i.category).filter(Boolean).join('; ') || 'N/A',
    `₹${order.pricing?.total || 0}`,
    order.status || 'unknown',
    order.paymentMethod || 'N/A'
  ]);

  const csvContent = [
    [`Report: ${reportName}`],
    [`Generated by: ${generatedBy}`],
    [`Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`],
    [`Total Orders: ${orders.length}`],
    [`Total Revenue: ₹${orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0)}`],
    [],
    headers,
    ...rows
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  return csvContent;
}

module.exports = router;
