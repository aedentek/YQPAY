const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Theater = require('../models/Theater');
const router = express.Router();

/**
 * GET /api/theater-dashboard/:theaterId
 * Get theater dashboard data including stats, recent orders, and theater info
 */
router.get('/:theaterId', authenticateToken, async (req, res) => {
  try {
    const { theaterId } = req.params;
    
    console.log(`🎭 Fetching dashboard data for theater: ${theaterId}`);
    
    // TODO: Implement proper data fetching from database
    // For now, return mock data to test the connection
    
    const stats = {
      totalOrders: 156,
      todayRevenue: 12450,
      activeProducts: 25,
      totalCustomers: 89
    };
    
    const recentOrders = [
      { 
        id: 1, 
        customerName: 'John Doe', 
        amount: 150, 
        status: 'completed',
        createdAt: new Date().toISOString()
      },
      { 
        id: 2, 
        customerName: 'Jane Smith', 
        amount: 89, 
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    ];
    
    // Try to fetch theater info from database
    let theater = null;
    try {
      theater = await Theater.findById(theaterId).select('name email phone address');
      console.log(`✅ Found theater: ${theater?.name || 'Unknown'}`);
    } catch (dbError) {
      console.log(`⚠️ Could not fetch theater from DB: ${dbError.message}`);
      theater = {
        _id: theaterId,
        name: 'Demo Theater',
        email: 'demo@theater.com'
      };
    }
    
    console.log(`📊 Returning dashboard data for theater: ${theater?.name}`);
    
    res.json({
      success: true,
      stats,
      recentOrders,
      theater
    });
    
  } catch (error) {
    console.error('❌ Theater dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

module.exports = router;