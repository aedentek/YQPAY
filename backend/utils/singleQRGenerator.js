const QRCode = require('qrcode');
const { uploadFile } = require('./gcsUploadUtil');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

/**
 * Fetch logo from URL or local path
 * @param {string} logoUrl - Logo URL or path
 * @returns {Promise<Buffer>} - Logo image buffer
 */
async function fetchLogo(logoUrl) {
  try {
    if (!logoUrl) return null;

    // Handle URL (http/https)
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      const response = await axios.get(logoUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000 
      });
      return Buffer.from(response.data);
    }

    // Handle local file path
    const localPath = logoUrl.startsWith('/') 
      ? path.join(__dirname, '../uploads', logoUrl)
      : path.join(__dirname, '..', logoUrl);
    
    const fileBuffer = await fs.readFile(localPath);
    return fileBuffer;

  } catch (error) {
    console.warn('⚠️  Failed to fetch logo:', error.message);
    return null;
  }
}

/**
 * Overlay logo on QR code center
 * @param {Buffer} qrBuffer - QR code image buffer
 * @param {Buffer} logoBuffer - Logo image buffer
 * @returns {Promise<Buffer>} - QR code with logo overlay
 */
async function overlayLogoOnQR(qrBuffer, logoBuffer) {
  try {
    // Load QR code image
    const qrImage = await loadImage(qrBuffer);
    const canvas = createCanvas(qrImage.width, qrImage.height);
    const ctx = canvas.getContext('2d');
    
    // Draw QR code
    ctx.drawImage(qrImage, 0, 0);
    
    // Load logo
    const logo = await loadImage(logoBuffer);
    
    // Calculate logo size (25% of QR code size for better visibility)
    const logoSize = Math.min(qrImage.width, qrImage.height) * 0.25;
    const x = (qrImage.width - logoSize) / 2;
    const y = (qrImage.height - logoSize) / 2;
    
    // Draw white background circle for logo (slightly larger for padding)
    const circleRadius = logoSize / 2 + 15;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      qrImage.width / 2, 
      qrImage.height / 2, 
      circleRadius, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    
    // Save context state
    ctx.save();
    
    // Create circular clipping path for logo
    ctx.beginPath();
    ctx.arc(
      qrImage.width / 2, 
      qrImage.height / 2, 
      logoSize / 2, 
      0, 
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    
    // Draw logo in center (clipped to circle)
    ctx.drawImage(logo, x, y, logoSize, logoSize);
    
    // Restore context
    ctx.restore();
    
    // Return canvas as buffer
    return canvas.toBuffer('image/png');
    
  } catch (error) {
    console.error('❌ Logo overlay error:', error);
    // Return original QR code if overlay fails
    return qrBuffer;
  }
}

/**
 * Get super admin primary color from settings
 * @returns {Promise<string>} Primary color hex code
 */
async function getSuperAdminPrimaryColor() {
  try {
    const db = mongoose.connection.db;
    const settingsDoc = await db.collection('settings').findOne({ type: 'general' });
    
    if (settingsDoc && settingsDoc.generalConfig && settingsDoc.generalConfig.primaryColor) {
      return settingsDoc.generalConfig.primaryColor;
    }
    
    // Fallback to default color
    return '#8B5CF6';
  } catch (error) {
    console.error('⚠️  Error fetching primary color, using default:', error.message);
    return '#8B5CF6';
  }
}

/**
 * Generate a single or screen QR code and upload to Google Cloud Storage
 * @param {Object} params - Generation parameters
 * @param {string} params.theaterId - Theater ID
 * @param {string} params.theaterName - Theater name for GCS path
 * @param {string} params.qrName - QR code name
 * @param {string} params.seatClass - Seat class
 * @param {string} params.seat - Seat identifier (only for screen type)
 * @param {string} params.logoUrl - Optional logo URL
 * @param {string} params.logoType - Logo type (default, theater, custom)
 * @param {string} params.userId - User ID generating the QR
 * @returns {Promise<Object>} Generated QR code details
 */
async function generateSingleQRCode({
  theaterId,
  theaterName,
  qrName,
  seatClass,
  seat = null,
  logoUrl = '',
  logoType = 'default',
  userId
}) {
  try {
    const qrTypeLabel = seat ? 'Screen' : 'Single';
    console.log(`🎨 Generating ${qrTypeLabel} QR Code:`, {
      theaterId,
      qrName,
      seatClass,
      seat
    });

    // Get super admin primary color for QR code
    const primaryColor = await getSuperAdminPrimaryColor();
    console.log(`🎨 Using primary color for QR code: ${primaryColor}`);

    // Generate unique QR code data URL
    const timestamp = Date.now();
    const seatPart = seat ? `_${seat}` : '';
    const uniqueId = `${theaterId}_${qrName}_${seatClass}${seatPart}_${timestamp}`.replace(/\s+/g, '_');
    
    // QR code will point to customer landing page with theater and seat info
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const typeParam = seat ? 'screen' : 'single';
    const seatParam = seat ? `&seat=${encodeURIComponent(seat)}` : '';
    const qrCodeData = `${baseUrl}/menu/${theaterId}?qrName=${encodeURIComponent(qrName)}&type=${typeParam}${seatParam}`;

    // QR code options with super admin primary color
    const qrOptions = {
      errorCorrectionLevel: 'H', // High error correction for logo overlay
      type: 'image/png',
      quality: 1,
      margin: 2,
      width: 512,
      color: {
        dark: primaryColor, // Use super admin's primary color
        light: '#FFFFFF'
      }
    };

    // Generate base QR code as buffer
    let qrCodeBuffer = await QRCode.toBuffer(qrCodeData, qrOptions);

    // Fetch and overlay logo if provided
    if (logoUrl) {
      console.log(`🖼️  Fetching logo for overlay: ${logoUrl}`);
      const logoBuffer = await fetchLogo(logoUrl);
      
      if (logoBuffer) {
        console.log(`✅ Logo fetched, overlaying on QR code...`);
        qrCodeBuffer = await overlayLogoOnQR(qrCodeBuffer, logoBuffer);
      }
    }

    // Upload to Google Cloud Storage
    const gcsPath = await uploadToGCS(qrCodeBuffer, {
      theaterId,
      theaterName,
      qrName,
      seatClass,
      seat,
      timestamp
    });

    console.log(`✅ ${qrTypeLabel} QR Code generated:`, {
      qrCodeData: qrCodeData.substring(0, 100) + '...',
      gcsPath
    });

    return {
      qrCodeUrl: gcsPath,
      qrCodeData: qrCodeData,
      logoUrl,
      logoType,
      uniqueId
    };

  } catch (error) {
    console.error('❌ Generate QR Code error:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Upload QR code image to Google Cloud Storage
 * @param {Buffer} buffer - QR code image buffer
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} GCS file URL
 */
async function uploadToGCS(buffer, metadata) {
  try {
    // Sanitize names for file paths
    const sanitizedTheater = metadata.theaterName ? metadata.theaterName.replace(/[^a-zA-Z0-9\-_]/g, '_') : metadata.theaterId;
    const sanitizedQRName = metadata.qrName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const sanitizedSeatClass = metadata.seatClass.replace(/[^a-zA-Z0-9\-_]/g, '_');
    
    // Create filename and folder structure matching existing pattern
    let folder, filename;
    
    if (metadata.seat) {
      // Screen QR: qr-codes/screen/{theater_name}/{qr_name}/
      folder = `qr-codes/screen/${sanitizedTheater}/${sanitizedQRName}`;
      const seatPart = metadata.seat.replace(/[^a-zA-Z0-9\-_]/g, '_');
      filename = `${sanitizedQRName}_${sanitizedSeatClass}_${seatPart}_${metadata.timestamp}.png`;
    } else {
      // Single QR: qr-codes/single/{theater_name}/
      folder = `qr-codes/single/${sanitizedTheater}`;
      filename = `${sanitizedQRName}_${sanitizedSeatClass}_${metadata.timestamp}.png`;
    }

    // Use the working GCS upload utility (loads credentials from MongoDB)
    const gcsUrl = await uploadFile(buffer, filename, folder, 'image/png');
    
    console.log('✅ Uploaded to GCS:', `${folder}/${filename}`);
    return gcsUrl;

  } catch (error) {
    console.error('❌ GCS Upload error:', error);
    
    // Fallback: save to local filesystem if GCS fails
    return await saveToLocalFilesystem(buffer, metadata);
  }
}

/**
 * Fallback: Save QR code to local filesystem
 * @param {Buffer} buffer - QR code image buffer
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} Local file URL
 */
async function saveToLocalFilesystem(buffer, metadata) {
  try {
    const sanitizedTheater = metadata.theaterName ? metadata.theaterName.replace(/[^a-zA-Z0-9\-_]/g, '_') : metadata.theaterId;
    const sanitizedQRName = metadata.qrName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const sanitizedSeatClass = metadata.seatClass.replace(/[^a-zA-Z0-9\-_]/g, '_');
    
    let uploadsDir, filename;
    
    if (metadata.seat) {
      // Screen QR: uploads/qr-codes/screen/{theater_name}/{qr_name}/
      uploadsDir = path.join(__dirname, '../uploads/qr-codes/screen', sanitizedTheater, sanitizedQRName);
      const seatPart = metadata.seat.replace(/[^a-zA-Z0-9\-_]/g, '_');
      filename = `${sanitizedQRName}_${sanitizedSeatClass}_${seatPart}_${metadata.timestamp}.png`;
    } else {
      // Single QR: uploads/qr-codes/single/{theater_name}/
      uploadsDir = path.join(__dirname, '../uploads/qr-codes/single', sanitizedTheater);
      filename = `${sanitizedQRName}_${sanitizedSeatClass}_${metadata.timestamp}.png`;
    }
    
    // Create directory if it doesn't exist
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);

    // Write buffer to file
    await fs.writeFile(filepath, buffer);

    // Return relative URL
    const qrType = metadata.seat ? 'screen' : 'single';
    const relativeUrl = metadata.seat 
      ? `/uploads/qr-codes/${qrType}/${sanitizedTheater}/${sanitizedQRName}/${filename}`
      : `/uploads/qr-codes/${qrType}/${sanitizedTheater}/${filename}`;
    
    console.log('✅ Saved to local filesystem:', relativeUrl);

    return relativeUrl;

  } catch (error) {
    console.error('❌ Local filesystem save error:', error);
    throw new Error(`Failed to save QR code: ${error.message}`);
  }
}

/**
 * Generate multiple single QR codes in batch
 * @param {Array} qrConfigs - Array of QR code configurations
 * @returns {Promise<Array>} Array of generated QR code details
 */
async function generateBatchSingleQRCodes(qrConfigs) {
  try {
    console.log(`🎨 Generating ${qrConfigs.length} Single QR Codes in batch`);

    const results = [];
    const errors = [];

    for (const config of qrConfigs) {
      try {
        const result = await generateSingleQRCode(config);
        results.push({
          success: true,
          ...result
        });
      } catch (error) {
        errors.push({
          success: false,
          config,
          error: error.message
        });
      }
    }

    console.log(`✅ Batch generation complete: ${results.length} success, ${errors.length} failed`);

    return {
      successful: results,
      failed: errors,
      totalGenerated: results.length,
      totalFailed: errors.length
    };

  } catch (error) {
    console.error('❌ Batch generation error:', error);
    throw error;
  }
}

module.exports = {
  generateSingleQRCode,
  generateBatchSingleQRCodes,
  uploadToGCS,
  saveToLocalFilesystem
};
