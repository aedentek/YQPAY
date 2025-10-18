const express = require('express');
const router = express.Router();
const QRCodeName = require('../models/QRCodeNameArray');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult, param, query } = require('express-validator');

console.log('🔧 QRCodeName Array routes file loaded successfully!');

/**
 * @route   GET /api/qrcodenames
 * @desc    Get QR code names for a theater (array-based structure)
 * @access  Public
 */
router.get('/', [
  query('theaterId').optional().isMongoId().withMessage('Invalid theater ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    console.log('📥 GET /api/qrcodenames - Request received');
    console.log('Query params:', req.query);
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theaterId, limit, isActive } = req.query;
    
    if (!theaterId) {
      return res.status(400).json({
        success: false,
        message: 'Theater ID is required'
      });
    }

    // Find QR names document for the theater
    const qrNamesDoc = await QRCodeName.findOne({ theater: theaterId })
      .populate('theater', 'name location');

    if (!qrNamesDoc) {
      // Return empty result if no document found
      return res.json({
        success: true,
        data: {
          qrCodeNames: [],
          theater: null,
          metadata: {
            totalQRNames: 0,
            activeQRNames: 0,
            inactiveQRNames: 0
          }
        }
      });
    }

    // Filter QR names based on isActive
    let qrNameList = qrNamesDoc.qrNameList;
    if (isActive !== undefined) {
      qrNameList = qrNameList.filter(qr => qr.isActive === (isActive === 'true'));
    }

    // Apply limit if specified
    if (limit) {
      qrNameList = qrNameList.slice(0, parseInt(limit));
    }

    console.log(`✅ Found ${qrNameList.length} QR names for theater ${theaterId}`);

    res.json({
      success: true,
      data: {
        qrCodeNames: qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error fetching QR code names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch QR code names',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/qrcodenames
 * @desc    Create a new QR code name (theaterId in body)
 * @access  Private (Admin/Theater Admin)
 */
router.post('/', [
  authenticateToken,
  body('theaterId').isMongoId().withMessage('Valid theater ID is required'),
  body('qrName').notEmpty().trim().withMessage('QR name is required'),
  body('seatClass').notEmpty().trim().withMessage('Seat class is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    console.log('📥 POST /api/qrcodenames - Create QR name (theaterId in body)');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theaterId, qrName, seatClass, description } = req.body;

    // Find or create QR names document for theater
    let qrNamesDoc = await QRCodeName.findOrCreateByTheater(theaterId);

    // Check if QR name already exists in this theater
    const existingQR = qrNamesDoc.qrNameList.find(qr => 
      qr.qrName.toLowerCase() === qrName.toLowerCase() && qr.isActive
    );

    if (existingQR) {
      return res.status(400).json({
        success: false,
        message: 'QR name already exists in this theater'
      });
    }

    // Add new QR name
    await qrNamesDoc.addQRName({
      qrName: qrName.trim(),
      seatClass: seatClass.trim(),
      description: description ? description.trim() : ''
    });

    // Populate theater info
    await qrNamesDoc.populate('theater', 'name location');

    console.log(`✅ QR name "${qrName}" created for theater ${theaterId}`);

    res.status(201).json({
      success: true,
      message: 'QR name created successfully',
      data: {
        qrCodeNames: qrNamesDoc.qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error creating QR name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create QR name',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/qrcodenames/:theaterId
 * @desc    Create a new QR code name for a theater
 * @access  Private (Admin/Theater Admin)
 */
router.post('/:theaterId', [
  authenticateToken,
  param('theaterId').isMongoId().withMessage('Valid theater ID is required'),
  body('qrName').notEmpty().trim().withMessage('QR name is required'),
  body('seatClass').notEmpty().trim().withMessage('Seat class is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    console.log('📥 POST /api/qrcodenames/:theaterId - Create QR name');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theaterId } = req.params;
    const { qrName, seatClass, description } = req.body;

    // Find or create QR names document for theater
    let qrNamesDoc = await QRCodeName.findOrCreateByTheater(theaterId);

    // Check if QR name already exists in this theater
    const existingQR = qrNamesDoc.qrNameList.find(qr => 
      qr.qrName.toLowerCase() === qrName.toLowerCase() && qr.isActive
    );

    if (existingQR) {
      return res.status(400).json({
        success: false,
        message: 'QR name already exists in this theater'
      });
    }

    // Add new QR name
    await qrNamesDoc.addQRName({
      qrName: qrName.trim(),
      seatClass: seatClass.trim(),
      description: description ? description.trim() : ''
    });

    // Populate theater info
    await qrNamesDoc.populate('theater', 'name location');

    console.log(`✅ QR name "${qrName}" created for theater ${theaterId}`);

    res.status(201).json({
      success: true,
      message: 'QR name created successfully',
      data: {
        qrCodeNames: qrNamesDoc.qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error creating QR name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create QR name',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/qrcodenames/:theaterId/:qrNameId
 * @desc    Update a QR code name
 * @access  Private (Admin/Theater Admin)
 */
router.put('/:theaterId/:qrNameId', [
  authenticateToken,
  param('theaterId').isMongoId().withMessage('Valid theater ID is required'),
  param('qrNameId').isMongoId().withMessage('Valid QR name ID is required'),
  body('qrName').optional().notEmpty().trim(),
  body('seatClass').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    console.log('📥 PUT /api/qrcodenames - Update QR name');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theaterId, qrNameId } = req.params;
    const updates = req.body;

    // Find QR names document
    const qrNamesDoc = await QRCodeName.findOne({ theater: theaterId });
    if (!qrNamesDoc) {
      return res.status(404).json({
        success: false,
        message: 'Theater QR names not found'
      });
    }

    // Update QR name
    await qrNamesDoc.updateQRName(qrNameId, updates);
    await qrNamesDoc.populate('theater', 'name location');

    console.log(`✅ QR name ${qrNameId} updated for theater ${theaterId}`);

    res.json({
      success: true,
      message: 'QR name updated successfully',
      data: {
        qrCodeNames: qrNamesDoc.qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error updating QR name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update QR name',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/qrcodenames/:theaterId/:qrNameId
 * @desc    Delete a QR code name
 * @access  Private (Admin/Theater Admin)
 */
router.delete('/:theaterId/:qrNameId', [
  authenticateToken,
  param('theaterId').isMongoId().withMessage('Valid theater ID is required'),
  param('qrNameId').isMongoId().withMessage('Valid QR name ID is required'),
  query('permanent').optional().isBoolean().withMessage('Permanent must be boolean')
], async (req, res) => {
  try {
    console.log('📥 DELETE /api/qrcodenames - Delete QR name');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theaterId, qrNameId } = req.params;
    const permanent = req.query.permanent === 'true';

    // Find QR names document
    const qrNamesDoc = await QRCodeName.findOne({ theater: theaterId });
    if (!qrNamesDoc) {
      return res.status(404).json({
        success: false,
        message: 'Theater QR names not found'
      });
    }

    if (permanent) {
      // Permanent delete
      await qrNamesDoc.deleteQRName(qrNameId);
      console.log(`✅ QR name ${qrNameId} permanently deleted`);
    } else {
      // Soft delete
      await qrNamesDoc.deactivateQRName(qrNameId);
      console.log(`✅ QR name ${qrNameId} deactivated`);
    }

    await qrNamesDoc.populate('theater', 'name location');

    res.json({
      success: true,
      message: permanent ? 'QR name permanently deleted' : 'QR name deactivated',
      data: {
        qrCodeNames: qrNamesDoc.qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error deleting QR name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete QR name',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/qrcodenames/:qrNameId
 * @desc    Update a QR code name by ID (finds theater automatically)
 * @access  Private (Admin/Theater Admin)
 */
router.put('/:qrNameId', [
  authenticateToken,
  param('qrNameId').isMongoId().withMessage('Valid QR name ID is required'),
  body('qrName').optional().notEmpty().trim(),
  body('seatClass').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    console.log('📥 PUT /api/qrcodenames/:qrNameId - Update QR name');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { qrNameId } = req.params;
    const updates = req.body;

    // Find QR names document that contains this QR name
    const qrNamesDoc = await QRCodeName.findOne({ 'qrNameList._id': qrNameId });
    if (!qrNamesDoc) {
      return res.status(404).json({
        success: false,
        message: 'QR name not found'
      });
    }

    // Update QR name
    await qrNamesDoc.updateQRName(qrNameId, updates);
    await qrNamesDoc.populate('theater', 'name location');

    console.log(`✅ QR name ${qrNameId} updated`);

    res.json({
      success: true,
      message: 'QR name updated successfully',
      data: {
        qrCodeNames: qrNamesDoc.qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error updating QR name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update QR name',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/qrcodenames/:qrNameId
 * @desc    Delete a QR code name by ID (finds theater automatically)
 * @access  Private (Admin/Theater Admin)
 */
router.delete('/:qrNameId', [
  authenticateToken,
  param('qrNameId').isMongoId().withMessage('Valid QR name ID is required'),
  query('permanent').optional().isBoolean().withMessage('Permanent must be boolean')
], async (req, res) => {
  try {
    console.log('📥 DELETE /api/qrcodenames/:qrNameId - Delete QR name');
    console.log('🔍 Request params:', req.params);
    console.log('🔍 QR Name ID:', req.params.qrNameId);
    console.log('🔍 Request query:', req.query);
    console.log('🔍 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { qrNameId } = req.params;
    const permanent = req.query.permanent === 'true';

    // Find QR names document that contains this QR name
    const qrNamesDoc = await QRCodeName.findOne({ 'qrNameList._id': qrNameId });
    if (!qrNamesDoc) {
      return res.status(404).json({
        success: false,
        message: 'QR name not found'
      });
    }

    if (permanent) {
      // Permanent delete
      await qrNamesDoc.deleteQRName(qrNameId);
      console.log(`✅ QR name ${qrNameId} permanently deleted`);
    } else {
      // Soft delete
      await qrNamesDoc.deactivateQRName(qrNameId);
      console.log(`✅ QR name ${qrNameId} deactivated`);
    }

    await qrNamesDoc.populate('theater', 'name location');

    res.json({
      success: true,
      message: permanent ? 'QR name permanently deleted' : 'QR name deactivated',
      data: {
        qrCodeNames: qrNamesDoc.qrNameList,
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error deleting QR name:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete QR name',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/qrcodenames/theater/:theaterId
 * @desc    Get all QR names for a specific theater
 * @access  Public
 */
router.get('/theater/:theaterId', [
  param('theaterId').isMongoId().withMessage('Valid theater ID is required')
], async (req, res) => {
  try {
    console.log('📥 GET /api/qrcodenames/theater/:theaterId');
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theaterId } = req.params;

    // Find QR names document for the theater
    const qrNamesDoc = await QRCodeName.findOne({ theater: theaterId })
      .populate('theater', 'name location');

    if (!qrNamesDoc) {
      return res.json({
        success: true,
        data: {
          qrCodeNames: [],
          theater: null,
          metadata: {
            totalQRNames: 0,
            activeQRNames: 0,
            inactiveQRNames: 0
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        qrCodeNames: qrNamesDoc.activeQRNamesList, // Only active QR names
        theater: qrNamesDoc.theater,
        metadata: qrNamesDoc.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error fetching theater QR names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch theater QR names',
      error: error.message
    });
  }
});

module.exports = router;