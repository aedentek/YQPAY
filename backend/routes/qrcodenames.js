const express = require('express');
const router = express.Router();
const QRCodeName = require('../models/QRCodeName');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { body, validationResult, param, query } = require('express-validator');

console.log('🔧 QRCodeName routes file loaded successfully!');

/**
 * @route   GET /api/qrcodenames
 * @desc    Get all QR code names with pagination and filters
 * @access  Public (optionalAuth - works with or without token)
 */
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('q').optional().isString().trim(),
  query('theaterId').optional().isMongoId().withMessage('Invalid theater ID'),
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

    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.q || '';
    const theaterId = req.query.theaterId;
    const isActiveFilter = req.query.isActive;

    // Build filter object
    const filter = {};
    
    // Add theater filter
    if (theaterId) {
      filter.theater = theaterId;
      console.log('🎭 Filtering by theater:', theaterId);
    }
    
    // Add active status filter
    if (isActiveFilter !== undefined) {
      filter.isActive = isActiveFilter === 'true';
      console.log('🔍 Filtering by isActive:', filter.isActive);
    }
    
    // Add search filter
    if (searchQuery.trim()) {
      filter.$or = [
        { qrName: { $regex: searchQuery, $options: 'i' } },
        { seatClass: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
      console.log('🔎 Search query:', searchQuery);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    console.log('📊 Filter:', JSON.stringify(filter));
    console.log('📄 Pagination - Page:', page, 'Limit:', limit, 'Skip:', skip);

    // Execute queries in parallel
    const [qrCodeNames, totalCount] = await Promise.all([
      QRCodeName.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('theater', 'name')
        .lean(),
      QRCodeName.countDocuments(filter)
    ]);

    console.log('✅ Found', qrCodeNames.length, 'QR code names (Total:', totalCount, ')');

    // Calculate summary statistics
    const summary = {
      total: totalCount,
      active: await QRCodeName.countDocuments({ ...filter, isActive: true }),
      inactive: await QRCodeName.countDocuments({ ...filter, isActive: false })
    };

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    res.json({
      success: true,
      message: 'QR code names retrieved successfully',
      data: {
        qrCodeNames,
        pagination,
        summary
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/qrcodenames:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR code names',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/qrcodenames/:id
 * @desc    Get single QR code name by ID
 * @access  Public (optionalAuth)
 */
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid QR code name ID')
], async (req, res) => {
  try {
    console.log('📥 GET /api/qrcodenames/:id - Request received');
    console.log('ID:', req.params.id);
    
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

    const qrCodeName = await QRCodeName.findById(req.params.id)
      .populate('theater', 'name');

    if (!qrCodeName) {
      console.log('❌ QR code name not found');
      return res.status(404).json({
        success: false,
        message: 'QR code name not found'
      });
    }

    console.log('✅ QR code name found:', qrCodeName.qrName);

    res.json({
      success: true,
      message: 'QR code name retrieved successfully',
      data: qrCodeName
    });

  } catch (error) {
    console.error('❌ Error in GET /api/qrcodenames/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR code name',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/qrcodenames
 * @desc    Create new QR code name
 * @access  Private (super_admin only)
 */
router.post('/', [
  authenticateToken,
  requireRole(['super_admin']),
  body('qrName').notEmpty().trim().withMessage('QR code name is required')
    .isLength({ max: 100 }).withMessage('QR code name cannot exceed 100 characters'),
  body('seatClass').notEmpty().trim().withMessage('Seat class is required')
    .isLength({ max: 50 }).withMessage('Seat class cannot exceed 50 characters'),
  body('description').optional().trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('theaterId').optional().isMongoId().withMessage('Invalid theater ID')
], async (req, res) => {
  try {
    console.log('📥 POST /api/qrcodenames - Create request received');
    console.log('Body:', req.body);
    console.log('User:', req.user?.email, 'Role:', req.user?.role);
    
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

    const { qrName, seatClass, description, isActive, theaterId } = req.body;

    // Generate normalized name for uniqueness check
    const normalizedName = `${qrName}_${seatClass}`
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '');

    console.log('🔍 Checking for duplicate normalized name:', normalizedName);

    // Check if QR code name already exists
    const existingQRCodeName = await QRCodeName.findOne({ normalizedName });
    if (existingQRCodeName) {
      console.log('❌ Duplicate QR code name found');
      return res.status(409).json({
        success: false,
        message: 'A QR code name with this combination already exists',
        error: 'DUPLICATE_QR_CODE_NAME'
      });
    }

    // Create new QR code name
    const newQRCodeName = new QRCodeName({
      qrName,
      seatClass,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      theater: theaterId || null
    });

    await newQRCodeName.save();

    console.log('✅ QR code name created successfully:', newQRCodeName._id);

    // Populate theater info if available
    await newQRCodeName.populate('theater', 'name');

    res.status(201).json({
      success: true,
      message: 'QR code name created successfully',
      data: newQRCodeName
    });

  } catch (error) {
    console.error('❌ Error in POST /api/qrcodenames:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create QR code name',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/qrcodenames/:id
 * @desc    Update QR code name
 * @access  Private (super_admin only)
 */
router.put('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isMongoId().withMessage('Invalid QR code name ID'),
  body('qrName').optional().notEmpty().trim()
    .isLength({ max: 100 }).withMessage('QR code name cannot exceed 100 characters'),
  body('seatClass').optional().notEmpty().trim()
    .isLength({ max: 50 }).withMessage('Seat class cannot exceed 50 characters'),
  body('description').optional().trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('theaterId').optional().isMongoId().withMessage('Invalid theater ID')
], async (req, res) => {
  try {
    console.log('📥 PUT /api/qrcodenames/:id - Update request received');
    console.log('ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('User:', req.user?.email, 'Role:', req.user?.role);
    
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

    // Find existing QR code name
    const qrCodeName = await QRCodeName.findById(req.params.id);
    if (!qrCodeName) {
      console.log('❌ QR code name not found');
      return res.status(404).json({
        success: false,
        message: 'QR code name not found'
      });
    }

    console.log('✅ Found QR code name:', qrCodeName.qrName);

    const { qrName: newQrName, seatClass: newSeatClass, description, isActive, theaterId } = req.body;

    // Check for duplicate if qrName or seatClass is being updated
    if ((newQrName && newQrName !== qrCodeName.qrName) || 
        (newSeatClass && newSeatClass !== qrCodeName.seatClass)) {
      
      const checkQrName = newQrName || qrCodeName.qrName;
      const checkSeatClass = newSeatClass || qrCodeName.seatClass;
      
      const normalizedName = `${checkQrName}_${checkSeatClass}`
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');

      console.log('🔍 Checking for duplicate normalized name:', normalizedName);

      const duplicateQRCodeName = await QRCodeName.findOne({
        normalizedName,
        _id: { $ne: req.params.id }
      });

      if (duplicateQRCodeName) {
        console.log('❌ Duplicate QR code name found');
        return res.status(409).json({
          success: false,
          message: 'A QR code name with this combination already exists',
          error: 'DUPLICATE_QR_CODE_NAME'
        });
      }
    }

    // Update fields
    if (newQrName !== undefined) qrCodeName.qrName = newQrName;
    if (newSeatClass !== undefined) qrCodeName.seatClass = newSeatClass;
    if (description !== undefined) qrCodeName.description = description;
    if (isActive !== undefined) qrCodeName.isActive = isActive;
    if (theaterId !== undefined) qrCodeName.theater = theaterId || null;

    await qrCodeName.save();

    console.log('✅ QR code name updated successfully');

    // Populate theater info if available
    await qrCodeName.populate('theater', 'name');

    res.json({
      success: true,
      message: 'QR code name updated successfully',
      data: qrCodeName
    });

  } catch (error) {
    console.error('❌ Error in PUT /api/qrcodenames/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update QR code name',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/qrcodenames/:id
 * @desc    Soft delete QR code name (set isActive to false)
 * @access  Private (super_admin only)
 */
router.delete('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isMongoId().withMessage('Invalid QR code name ID')
], async (req, res) => {
  try {
    console.log('📥 DELETE /api/qrcodenames/:id - Delete request received');
    console.log('ID:', req.params.id);
    console.log('User:', req.user?.email, 'Role:', req.user?.role);
    
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

    // Find QR code name
    const qrCodeName = await QRCodeName.findById(req.params.id);
    if (!qrCodeName) {
      console.log('❌ QR code name not found');
      return res.status(404).json({
        success: false,
        message: 'QR code name not found'
      });
    }

    console.log('✅ Found QR code name:', qrCodeName.qrName);

    // Check if already deleted
    if (!qrCodeName.isActive) {
      console.log('⚠️ QR code name already marked as inactive');
      return res.status(400).json({
        success: false,
        message: 'QR code name is already inactive'
      });
    }

    // Soft delete - set isActive to false
    qrCodeName.isActive = false;
    await qrCodeName.save();

    console.log('✅ QR code name soft deleted successfully');

    res.json({
      success: true,
      message: 'QR code name deleted successfully',
      data: qrCodeName
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/qrcodenames/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete QR code name',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/qrcodenames/:id/restore
 * @desc    Restore soft-deleted QR code name (set isActive to true)
 * @access  Private (super_admin only)
 */
router.patch('/:id/restore', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isMongoId().withMessage('Invalid QR code name ID')
], async (req, res) => {
  try {
    console.log('📥 PATCH /api/qrcodenames/:id/restore - Restore request received');
    console.log('ID:', req.params.id);
    
    const qrCodeName = await QRCodeName.findById(req.params.id);
    if (!qrCodeName) {
      return res.status(404).json({
        success: false,
        message: 'QR code name not found'
      });
    }

    if (qrCodeName.isActive) {
      return res.status(400).json({
        success: false,
        message: 'QR code name is already active'
      });
    }

    qrCodeName.isActive = true;
    await qrCodeName.save();

    console.log('✅ QR code name restored successfully');

    res.json({
      success: true,
      message: 'QR code name restored successfully',
      data: qrCodeName
    });

  } catch (error) {
    console.error('❌ Error in PATCH /api/qrcodenames/:id/restore:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore QR code name',
      error: error.message
    });
  }
});

module.exports = router;
