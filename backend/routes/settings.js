const express = require('express');
const Settings = require('../models/Settings');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/settings/general
 * Get general settings (public settings)
 */
router.get('/general', [optionalAuth], async (req, res) => {
  try {
    let theaterId = req.query.theaterId;
    
    // If authenticated, use user's theater ID if no specific theater requested
    if (!theaterId && req.user?.theaterId) {
      theaterId = req.user.theaterId;
    }

    let settings = {};

    // ✅ FIX: Try to load from the actual settings collection first
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    try {
      // Query the actual settings collection for general config
      const settingsDoc = await db.collection('settings').findOne({ type: 'general' });
      
      if (settingsDoc && settingsDoc.generalConfig) {
        // Map the database fields to frontend expected format
        const generalConfig = settingsDoc.generalConfig;
        settings = {
          applicationName: generalConfig.applicationName || 'Theater Canteen System',
          browserTabTitle: generalConfig.browserTabTitle || 'YQPayNow - Theater Canteen',
          logoUrl: generalConfig.logoUrl || '',
          qrCodeUrl: generalConfig.qrCodeUrl || '',
          environment: generalConfig.environment || 'development',
          defaultCurrency: generalConfig.defaultCurrency || 'INR',
          timezone: generalConfig.timezone || 'Asia/Kolkata',
          dateFormat: generalConfig.dateFormat || 'DD/MM/YYYY',
          timeFormat: generalConfig.timeFormat || '12hour',
          languageRegion: generalConfig.languageRegion || 'en-IN',
          // Additional fields
          currency: generalConfig.currency || generalConfig.defaultCurrency || 'INR',
          currencySymbol: generalConfig.currencySymbol || '₹',
          primaryColor: generalConfig.primaryColor || '#8B5CF6',
          secondaryColor: generalConfig.secondaryColor || '#6366F1',
          taxRate: generalConfig.taxRate || 18,
          serviceChargeRate: generalConfig.serviceChargeRate || 0
        };
        
        console.log('✅ Loaded general settings from database:', settings);
      } else {
        console.log('⚠️ No general settings found in database, using defaults');
        // Return default global settings if nothing found
        settings = {
          applicationName: 'Theater Canteen System',
          browserTabTitle: 'YQPayNow - Theater Canteen',
          logoUrl: '',
          qrCodeUrl: '',
          environment: 'development',
          defaultCurrency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12hour',
          languageRegion: 'en-IN',
          currency: 'INR',
          currencySymbol: '₹',
          primaryColor: '#8B5CF6',
          secondaryColor: '#6366F1',
          taxRate: 18,
          serviceChargeRate: 0
        };
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Fallback to defaults on error
      settings = {
        applicationName: 'Theater Canteen System',
        browserTabTitle: 'YQPayNow - Theater Canteen',
        logoUrl: '',
        qrCodeUrl: '',
        environment: 'development',
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12hour',
        languageRegion: 'en-IN',
        currency: 'INR',
        currencySymbol: '₹',
        primaryColor: '#8B5CF6',
        secondaryColor: '#6366F1',
        taxRate: 18,
        serviceChargeRate: 0
      };
    }

    // Return settings in the format frontend expects
    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get general settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/settings/general
 * Update general settings
 */
router.post('/general', [optionalAuth], async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    // ✅ FIX: Define all allowed settings fields
    const allowedSettings = [
      'applicationName', 'browserTabTitle', 'logoUrl', 'qrCodeUrl',
      'environment', 'defaultCurrency', 'timezone', 'dateFormat',
      'timeFormat', 'languageRegion', 'currency', 'currencySymbol',
      'primaryColor', 'secondaryColor', 'taxRate', 'serviceChargeRate',
      'siteName', 'siteDescription', 'orderTimeout', 'maintenanceMode',
      'allowRegistration', 'requireEmailVerification', 'requirePhoneVerification',
      'maxOrdersPerDay', 'minOrderAmount', 'deliveryCharge', 'freeDeliveryThreshold',
      'frontendUrl'
    ];

    // Filter incoming settings to only allowed fields
    const updatedConfig = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedSettings.includes(key)) {
        updatedConfig[key] = value;
      }
    }

    console.log('🔄 Updating general settings:', updatedConfig);

    // Update or create the settings document
    const result = await db.collection('settings').findOneAndUpdate(
      { type: 'general' },
      {
        $set: {
          'generalConfig': {
            ...updatedConfig
          },
          lastUpdated: new Date(),
          version: { $inc: 1 }
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    console.log('✅ Settings updated successfully');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedConfig
    });

  } catch (error) {
    console.error('Update general settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

/**
 * GET /api/settings/firebase
 * Get Firebase settings (restricted)
 */
router.get('/firebase', [authenticateToken], async (req, res) => {
  try {
    let theaterId = req.user.theaterId;
    
    if (req.user.role === 'super_admin' && req.query.theaterId) {
      theaterId = req.query.theaterId;
    }

    const settings = theaterId 
      ? await Settings.getCategory(theaterId, 'firebase')
      : {};

    res.json({
      success: true,
      data: { config: settings }
    });

  } catch (error) {
    console.error('Get Firebase settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch Firebase settings',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/settings/gcs
 * Get Google Cloud Storage settings (restricted)
 */
router.get('/gcs', [authenticateToken], async (req, res) => {
  try {
    let theaterId = req.user.theaterId;
    
    if (req.user.role === 'super_admin' && req.query.theaterId) {
      theaterId = req.query.theaterId;
    }

    const settings = theaterId 
      ? await Settings.getCategory(theaterId, 'gcs')
      : {};

    res.json({
      success: true,
      data: { config: settings }
    });

  } catch (error) {
    console.error('Get GCS settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch GCS settings',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/settings/mongodb
 * Get MongoDB settings (restricted)
 */
router.get('/mongodb', [authenticateToken], async (req, res) => {
  try {
    let theaterId = req.user.theaterId;
    
    if (req.user.role === 'super_admin' && req.query.theaterId) {
      theaterId = req.query.theaterId;
    }

    const settings = theaterId 
      ? await Settings.getCategory(theaterId, 'mongodb')
      : {};

    res.json({
      success: true,
      data: { config: settings }
    });

  } catch (error) {
    console.error('Get MongoDB settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch MongoDB settings',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/settings/sms
 * Get SMS settings (restricted)
 */
router.get('/sms', [authenticateToken], async (req, res) => {
  try {
    let theaterId = req.user.theaterId;
    
    if (req.user.role === 'super_admin' && req.query.theaterId) {
      theaterId = req.query.theaterId;
    }

    const settings = theaterId 
      ? await Settings.getCategory(theaterId, 'sms')
      : {};

    res.json({
      success: true,
      data: { config: settings }
    });

  } catch (error) {
    console.error('Get SMS settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch SMS settings',
      message: 'Internal server error'
    });
  }
});

/**
 * OPTIONS /api/settings/image/logo
 * Handle preflight CORS requests for favicon
 */
router.options('/image/logo', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400' // 24 hours
  });
  res.status(204).send();
});

/**
 * GET /api/settings/image/logo
 * Serve logo image with CORS headers (proxies GCS URL)
 * Public endpoint for favicon usage
 * 
 * Note: We proxy instead of redirect because favicons need proper CORS headers
 * and GCS signed URLs don't include CORS headers by default
 */
router.get('/image/logo', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const axios = require('axios');
    
    // Get logo URL from settings
    const settingsDoc = await db.collection('settings').findOne({ type: 'general' });
    
    if (settingsDoc && settingsDoc.generalConfig && settingsDoc.generalConfig.logoUrl) {
      const logoUrl = settingsDoc.generalConfig.logoUrl;
      console.log('🎨 Serving logo from:', logoUrl.substring(0, 100) + '...');
      
      try {
        // Fetch image from GCS (or other URL)
        const imageResponse = await axios.get(logoUrl, {
          responseType: 'arraybuffer',
          timeout: 10000, // 10 second timeout
          maxRedirects: 5
        });
        
        // Get content type from response
        const contentType = imageResponse.headers['content-type'] || 'image/png';
        
        // Set CORS and cache headers for favicon
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*', // Allow all origins for favicon
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cross-Origin-Resource-Policy': 'cross-origin' // Important for favicon
        });
        
        // Send the image buffer
        res.send(Buffer.from(imageResponse.data));
        console.log('✅ Logo served successfully with CORS headers');
        
      } catch (proxyError) {
        console.error('❌ Error fetching logo from URL:', proxyError.message);
        // Return 404 instead of error
        res.status(404).send('Logo not found or unavailable');
      }
    } else {
      console.log('⚠️ No logo URL found in settings');
      // Return 404 for no logo
      res.status(404).send('Logo not configured');
    }
  } catch (error) {
    console.error('❌ Error serving logo:', error);
    res.status(500).send('Error loading logo');
  }
});

module.exports = router;