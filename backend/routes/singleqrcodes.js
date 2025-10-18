const express = require('express');
const SingleQRCode = require('../models/SingleQRCode');
const Theater = require('../models/Theater');
const { authenticateToken } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const { generateSingleQRCode } = require('../utils/singleQRGenerator');
const { deleteFile } = require('../utils/gcsUploadUtil');

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Single QR Code routes are working!' });
});

/**
 * POST /api/single-qrcodes
 * Create a new single OR screen QR code entry
 * Handles both qrType: 'single' and qrType: 'screen'
 */
router.post('/', [
  authenticateToken,
  body('theaterId').isMongoId().withMessage('Valid theater ID is required'),
  body('qrType').isIn(['single', 'screen']).withMessage('QR type must be single or screen'),
  body('qrName').notEmpty().trim().withMessage('QR code name is required'),
  body('seatClass').notEmpty().trim().withMessage('Seat class is required'),
  body('seat').optional().trim(), // Only for screen type
  body('seats').optional().isArray(), // Array of seats for screen type batch generation
  body('logoUrl').optional().trim(),
  body('logoType').optional().isIn(['default', 'theater', 'custom', '']).withMessage('Invalid logo type')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array().map(e => e.msg).join(', '),
        details: errors.array()
      });
    }

    const { theaterId, qrType, qrName, seatClass, seat, seats, logoUrl, logoType } = req.body;

    console.log('📥 Creating QR Code:', {
      theaterId,
      qrType,
      qrName,
      seatClass,
      seat,
      seats: seats ? seats.length : 0,
      logoUrl,
      logoType,
      user: req.user?.userId
    });

    // Verify theater exists
    const theater = await Theater.findById(theaterId);
    if (!theater) {
      return res.status(404).json({
        success: false,
        error: 'Theater not found'
      });
    }
    
    const theaterName = theater.name || theater.theaterName || 'Unknown';
    console.log('🏛️ Theater name:', theaterName);

    // Validate screen type requirements
    if (qrType === 'screen' && !seat && (!seats || seats.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Seat or seats array is required for screen type QR codes'
      });
    }

    // Find or create the single document for this theater
    let singleQR = await SingleQRCode.findOne({ theater: theaterId });
    
    console.log('🔍 Looking for existing document with theater:', theaterId);
    console.log('🔍 Found existing document?', singleQR ? 'YES' : 'NO');
    if (singleQR) {
      console.log('📋 Existing document ID:', singleQR._id);
      console.log('📋 Current qrDetails count:', singleQR.qrDetails.length);
    }
    
    // Determine which seats to generate
    const seatsToGenerate = qrType === 'single' 
      ? [null] // Single QR doesn't need seat
      : (seats && seats.length > 0 ? seats : [seat]); // Screen type: use seats array or single seat
    
    console.log('🎯 Generating QR codes for seats:', seatsToGenerate);
    
    if (qrType === 'single') {
      // ============ SINGLE QR CODE GENERATION ============
      // Generate single QR code
      const qrCodeResult = await generateSingleQRCode({
        theaterId,
        theaterName,
        qrName,
        seatClass,
        seat: null,
        logoUrl,
        logoType,
        userId: req.user?.userId
      });

      const qrDetailObj = {
        qrType: 'single',
        qrName: qrName,
        seatClass: seatClass,
        qrCodeUrl: qrCodeResult.qrCodeUrl,
        qrCodeData: qrCodeResult.qrCodeData,
        logoUrl: logoUrl || '',
        logoType: logoType || 'default',
        scanCount: 0,
        seats: [], // Empty array for single type
        metadata: {
          generatedBy: req.user?.userId,
          generatedAt: new Date(),
          version: '1.0'
        }
      };

      if (singleQR) {
        await singleQR.addQRDetail(qrDetailObj);
        console.log('✅ Single QR code added to existing theater document');
      } else {
        singleQR = new SingleQRCode({
          theater: theaterId,
          qrDetails: [{
            ...qrDetailObj,
            isActive: true
          }],
          isActive: true,
          metadata: {
            totalQRs: 1,
            activeQRs: 1,
            totalScans: 0,
            lastGeneratedAt: new Date()
          }
        });
        await singleQR.save();
        console.log('✅ New document created with single QR code');
      }
      
    } else {
      // ============ SCREEN QR CODE GENERATION ============
      // Check if this qrName+seatClass combination already exists in the array
      const existingScreenQR = singleQR ? 
        singleQR.qrDetails.find(qr => 
          qr.qrType === 'screen' && 
          qr.qrName === qrName && 
          qr.seatClass === seatClass
        ) : null;
      
      // Generate QR codes for each seat
      const generatedSeats = [];
      for (const seatId of seatsToGenerate) {
        const qrCodeResult = await generateSingleQRCode({
          theaterId,
          theaterName,
          qrName,
          seatClass,
          seat: seatId,
          logoUrl,
          logoType,
          userId: req.user?.userId
        });

        generatedSeats.push({
          seat: seatId,
          qrCodeUrl: qrCodeResult.qrCodeUrl,
          qrCodeData: qrCodeResult.qrCodeData,
          logoUrl: logoUrl || '',
          logoType: logoType || 'default',
          scanCount: 0,
          metadata: {
            generatedBy: req.user?.userId,
            generatedAt: new Date(),
            version: '1.0'
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      if (existingScreenQR) {
        // Add seats to existing screen QR entry
        existingScreenQR.seats.push(...generatedSeats);
        existingScreenQR.updatedAt = new Date();
        await singleQR.save();
        console.log(`✅ Added ${generatedSeats.length} seats to existing screen QR entry`);
      } else {
        // Create new screen QR entry
        const screenQRObj = {
          qrType: 'screen',
          qrName: qrName,
          seatClass: seatClass,
          qrCodeUrl: '', // Not used for screen type
          qrCodeData: '', // Not used for screen type
          logoUrl: '', // Not used for screen type
          logoType: 'default',
          scanCount: 0, // Not used for screen type
          seats: generatedSeats, // Nested array of seats
          metadata: {
            generatedBy: req.user?.userId,
            generatedAt: new Date(),
            version: '1.0'
          },
          isActive: true
        };

        if (singleQR) {
          await singleQR.addQRDetail(screenQRObj);
          console.log(`✅ New screen QR entry with ${generatedSeats.length} seats added to existing document`);
        } else {
          singleQR = new SingleQRCode({
            theater: theaterId,
            qrDetails: [screenQRObj],
            isActive: true,
            metadata: {
              totalQRs: generatedSeats.length,
              activeQRs: generatedSeats.length,
              totalScans: 0,
              lastGeneratedAt: new Date()
            }
          });
          await singleQR.save();
          console.log(`✅ New document created with screen QR entry containing ${generatedSeats.length} seats`);
        }
      }
    }

    // Populate theater details
    await singleQR.populate('theater', 'name location');
    
    const totalGenerated = qrType === 'single' ? 1 : seatsToGenerate.length;

    res.status(201).json({
      success: true,
      message: qrType === 'single' 
        ? 'Single QR code created successfully' 
        : `${totalGenerated} Screen QR code(s) created successfully`,
      data: singleQR,
      count: totalGenerated
    });

  } catch (error) {
    console.error('❌ Create QR Code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create QR code',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/single-qrcodes
 * Get all single QR codes with optional filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      theaterId, 
      qrName, 
      seatClass, 
      isActive, 
      limit = 100,
      skip = 0,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (theaterId) {
      query.theater = theaterId;
    }

    // Filter by qrName in array
    if (qrName) {
      query['qrDetails.qrName'] = new RegExp(qrName, 'i');
    }

    // Filter by seatClass in array
    if (seatClass) {
      query['qrDetails.seatClass'] = new RegExp(seatClass, 'i');
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const singleQRCodes = await SingleQRCode.find(query)
      .populate('theater', 'name location city')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await SingleQRCode.countDocuments(query);

    res.json({
      success: true,
      data: singleQRCodes,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + singleQRCodes.length)
      }
    });

  } catch (error) {
    console.error('❌ Get Single QR Codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch single QR codes',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/single-qrcodes/theater/:theaterId
 * Get all single QR codes for a specific theater
 */
router.get('/theater/:theaterId', [
  authenticateToken,
  param('theaterId').isMongoId().withMessage('Valid theater ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { theaterId } = req.params;
    const { isActive } = req.query;

    const singleQRCodes = await SingleQRCode.findByTheater(theaterId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });

    // Flatten qrDetails array from all documents into a single array
    const flattenedQRCodes = [];
    
    singleQRCodes.forEach(doc => {
      if (doc.qrDetails && doc.qrDetails.length > 0) {
        doc.qrDetails.forEach(qrDetail => {
          // Transform each qrDetail to match frontend expected structure
          flattenedQRCodes.push({
            _id: qrDetail._id,
            name: qrDetail.qrName,
            qrType: qrDetail.qrType,
            seatClass: qrDetail.seatClass,
            qrImageUrl: qrDetail.qrCodeUrl, // Map qrCodeUrl to qrImageUrl
            logoUrl: qrDetail.logoUrl,
            logoType: qrDetail.logoType,
            screenName: qrDetail.screen,
            seatNumber: qrDetail.seat,
            seats: qrDetail.seats,
            isActive: qrDetail.isActive,
            scanCount: qrDetail.scanCount || 0,
            orderCount: qrDetail.orderCount || 0,
            totalRevenue: qrDetail.totalRevenue || 0,
            lastScannedAt: qrDetail.lastScannedAt,
            createdAt: qrDetail.createdAt,
            updatedAt: qrDetail.updatedAt,
            theater: doc.theater,
            parentDocId: doc._id // Keep reference to parent document
          });
        });
      }
    });

    console.log(`✅ Found ${flattenedQRCodes.length} QR codes for theater ${theaterId}`);

    res.json({
      success: true,
      data: {
        qrCodes: flattenedQRCodes,
        total: flattenedQRCodes.length
      }
    });

  } catch (error) {
    console.error('❌ Get Theater Single QR Codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theater single QR codes',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/single-qrcodes/:id
 * Get a specific single QR code by ID
 */
router.get('/:id', [
  authenticateToken,
  param('id').isMongoId().withMessage('Valid single QR code ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const singleQR = await SingleQRCode.findById(req.params.id)
      .populate('theater', 'name location city');

    if (!singleQR) {
      return res.status(404).json({
        success: false,
        error: 'Single QR code not found'
      });
    }

    res.json({
      success: true,
      data: singleQR
    });

  } catch (error) {
    console.error('❌ Get Single QR Code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch single QR code',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * PUT /api/single-qrcodes/:id
 * Update a single QR code document (not individual QR details)
 */
router.put('/:id', [
  authenticateToken,
  param('id').isMongoId().withMessage('Valid single QR code ID is required'),
  body('qrName').optional().trim(),
  body('seatClass').optional().trim(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { qrName, seatClass, isActive } = req.body;

    const singleQR = await SingleQRCode.findById(req.params.id);

    if (!singleQR) {
      return res.status(404).json({
        success: false,
        error: 'Single QR code not found'
      });
    }

    // Update allowed fields
    if (qrName !== undefined) singleQR.qrName = qrName;
    if (seatClass !== undefined) singleQR.seatClass = seatClass;
    if (isActive !== undefined) singleQR.isActive = isActive;

    await singleQR.save();
    await singleQR.populate('theater', 'name location city');

    console.log('✅ Single QR Code updated:', req.params.id);

    res.json({
      success: true,
      message: 'Single QR code updated successfully',
      data: singleQR
    });

  } catch (error) {
    console.error('❌ Update Single QR Code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update single QR code',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * PUT /api/single-qrcodes/:id/details/:detailId
 * Update a specific QR detail within the array
 * Now regenerates the QR code with new data and deletes old image from GCS
 */
router.put('/:id/details/:detailId', [
  authenticateToken,
  param('id').isMongoId().withMessage('Valid single QR code ID is required'),
  param('detailId').isMongoId().withMessage('Valid QR detail ID is required'),
  body('qrName').optional().trim(),
  body('seatClass').optional().trim(),
  body('seat').optional().trim(),
  body('logoUrl').optional().trim(),
  body('logoType').optional().isIn(['default', 'theater', 'custom', '']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id, detailId } = req.params;
    const updates = req.body;

    const singleQR = await SingleQRCode.findById(id).populate('theater', 'name location city');

    if (!singleQR) {
      return res.status(404).json({
        success: false,
        error: 'Single QR code not found'
      });
    }

    // Get the existing QR detail
    const qrDetail = singleQR.qrDetails.id(detailId);
    
    if (!qrDetail) {
      return res.status(404).json({
        success: false,
        error: 'QR detail not found'
      });
    }

    // Check if we need to regenerate the QR code (if critical data changed)
    const needsRegeneration = 
      (updates.qrName && updates.qrName !== qrDetail.qrName) ||
      (updates.seatClass && updates.seatClass !== qrDetail.seatClass) ||
      (updates.seat && updates.seat !== qrDetail.seat) ||
      (updates.logoUrl && updates.logoUrl !== qrDetail.logoUrl);

    if (needsRegeneration) {
      console.log('🔄 Regenerating QR code due to data changes...');
      
      // Store old QR code URL for deletion
      const oldQrCodeUrl = qrDetail.qrCodeUrl;

      // Generate new QR code with updated data
      const qrData = await generateSingleQRCode({
        theaterId: singleQR.theater._id,
        theaterName: singleQR.theater.name,
        qrName: updates.qrName || qrDetail.qrName,
        seatClass: updates.seatClass || qrDetail.seatClass,
        seat: updates.seat || qrDetail.seat || null,
        logoUrl: updates.logoUrl || qrDetail.logoUrl,
        logoType: updates.logoType || qrDetail.logoType,
        userId: req.user.id
      });

      // Update with new QR code data
      updates.qrCodeUrl = qrData.qrCodeUrl;
      updates.qrCodeData = qrData.qrCodeData;
      
      console.log('✅ New QR code generated:', qrData.qrCodeUrl);

      // Delete old QR code from GCS
      if (oldQrCodeUrl) {
        console.log('🗑️  Deleting old QR code from GCS:', oldQrCodeUrl);
        const deletedFromGCS = await deleteFile(oldQrCodeUrl);
        if (deletedFromGCS) {
          console.log('✅ Old QR code deleted from GCS');
        } else {
          console.warn('⚠️  Failed to delete old QR code from GCS (may not exist)');
        }
      }
    } else {
      console.log('ℹ️  No regeneration needed, updating metadata only');
    }

    // Update the QR detail with all changes
    await singleQR.updateQRDetail(detailId, updates);

    console.log('✅ QR Detail updated:', detailId);

    res.json({
      success: true,
      message: needsRegeneration 
        ? 'QR code regenerated and updated successfully' 
        : 'QR detail updated successfully',
      data: singleQR
    });

  } catch (error) {
    console.error('❌ Update QR Detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update QR detail',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * DELETE /api/single-qrcodes/:id
 * Delete (soft delete) a single QR code document
 */
router.delete('/:id', [
  authenticateToken,
  param('id').isMongoId().withMessage('Valid single QR code ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanent delete
      const singleQR = await SingleQRCode.findByIdAndDelete(req.params.id);
      
      if (!singleQR) {
        return res.status(404).json({
          success: false,
          error: 'Single QR code not found'
        });
      }

      console.log('✅ Single QR Code permanently deleted:', req.params.id);

      res.json({
        success: true,
        message: 'Single QR code permanently deleted'
      });
    } else {
      // Soft delete
      const singleQR = await SingleQRCode.findById(req.params.id);

      if (!singleQR) {
        return res.status(404).json({
          success: false,
          error: 'Single QR code not found'
        });
      }

      singleQR.isActive = false;
      await singleQR.save();

      console.log('✅ Single QR Code deactivated:', req.params.id);

      res.json({
        success: true,
        message: 'Single QR code deactivated successfully',
        data: singleQR
      });
    }

  } catch (error) {
    console.error('❌ Delete Single QR Code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete single QR code',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * DELETE /api/single-qrcodes/:id/details/:detailId
 * Delete a specific QR detail from the array
 */
router.delete('/:id/details/:detailId', [
  authenticateToken,
  param('id').isMongoId().withMessage('Valid single QR code ID is required'),
  param('detailId').isMongoId().withMessage('Valid QR detail ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id, detailId } = req.params;
    const { permanent } = req.query;

    const singleQR = await SingleQRCode.findById(id);

    if (!singleQR) {
      return res.status(404).json({
        success: false,
        error: 'Single QR code not found'
      });
    }

    // Get the QR detail before deletion to access qrCodeUrl
    const qrDetail = singleQR.qrDetails.id(detailId);
    
    if (!qrDetail) {
      return res.status(404).json({
        success: false,
        error: 'QR detail not found'
      });
    }

    if (permanent === 'true') {
      // Delete QR code image from Google Cloud Storage
      if (qrDetail.qrCodeUrl) {
        console.log('🗑️  Attempting to delete QR code image from GCS:', qrDetail.qrCodeUrl);
        const deletedFromGCS = await deleteFile(qrDetail.qrCodeUrl);
        if (deletedFromGCS) {
          console.log('✅ QR code image deleted from GCS');
        } else {
          console.warn('⚠️  Failed to delete QR code image from GCS (may not exist)');
        }
      }

      // Also delete seat QR codes if it's a screen type with seats array
      if (qrDetail.qrType === 'screen' && qrDetail.seats && qrDetail.seats.length > 0) {
        console.log(`🗑️  Deleting ${qrDetail.seats.length} seat QR code images from GCS`);
        for (const seat of qrDetail.seats) {
          if (seat.qrCodeUrl) {
            await deleteFile(seat.qrCodeUrl);
          }
        }
      }

      // Permanently remove from array
      await singleQR.deleteQRDetail(detailId);
      console.log('✅ QR Detail permanently deleted from database:', detailId);
    } else {
      // Soft delete (deactivate) - keep the image in GCS
      await singleQR.deactivateQRDetail(detailId);
      console.log('✅ QR Detail deactivated:', detailId);
    }

    await singleQR.populate('theater', 'name location city');

    res.json({
      success: true,
      message: permanent === 'true' ? 'QR detail permanently deleted' : 'QR detail deactivated successfully',
      data: singleQR
    });

  } catch (error) {
    console.error('❌ Delete QR Detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete QR detail',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/single-qrcodes/:id/details/:detailId/scan
 * Record a scan for a specific QR detail
 */
router.post('/:id/details/:detailId/scan', [
  param('id').isMongoId().withMessage('Valid single QR code ID is required'),
  param('detailId').isMongoId().withMessage('Valid QR detail ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id, detailId } = req.params;

    const singleQR = await SingleQRCode.findById(id);

    if (!singleQR) {
      return res.status(404).json({
        success: false,
        error: 'Single QR code not found'
      });
    }

    await singleQR.recordScan(detailId);

    console.log('✅ QR Scan recorded:', detailId);

    res.json({
      success: true,
      message: 'QR scan recorded successfully',
      data: {
        scanCount: singleQR.qrDetails.id(detailId).scanCount,
        totalScans: singleQR.metadata.totalScans
      }
    });

  } catch (error) {
    console.error('❌ Record QR Scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record QR scan',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/single-qrcodes/stats/summary
 * Get summary statistics for single QR codes
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { theaterId } = req.query;

    const matchStage = theaterId ? { theater: mongoose.Types.ObjectId(theaterId) } : {};

    const stats = await SingleQRCode.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          activeDocuments: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          totalQRs: { $sum: '$metadata.totalQRs' },
          totalActiveQRs: { $sum: '$metadata.activeQRs' },
          totalScans: { $sum: '$metadata.totalScans' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalDocuments: 0,
        activeDocuments: 0,
        totalQRs: 0,
        totalActiveQRs: 0,
        totalScans: 0
      }
    });

  } catch (error) {
    console.error('❌ Get Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = router;
