const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile } = require('../utils/gcsUploadUtil');

const router = express.Router();

// Configure multer for memory storage (for GCS uploads)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    if (file.fieldname === 'image' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else if (file.fieldname === 'document' && (
      file.mimetype === 'application/pdf' ||
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

/**
 * POST /api/upload/image
 * Upload an image file to Google Cloud Storage
 * Note: Authentication temporarily disabled for settings uploads
 */
router.post('/image', [upload.single('image')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    // Get folder parameters from request
    const folderType = req.body.folderType || 'general';
    const folderSubtype = req.body.folderSubtype || 'images';
    const folder = `${folderType}/${folderSubtype}`;

    console.log(`📤 Uploading image to GCS folder: ${folder}`);
    console.log(`   File: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

    // Upload to Google Cloud Storage
    const publicUrl = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder,
      req.file.mimetype
    );

    const fileInfo = {
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      publicUrl: publicUrl,
      uploadedAt: new Date()
    };

    console.log(`✅ Image uploaded successfully to: ${publicUrl.substring(0, 80)}...`);

    res.json({
      success: true,
      message: 'Image uploaded successfully to Google Cloud Storage',
      data: fileInfo
    });

  } catch (error) {
    console.error('❌ Upload image error:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/upload/theater-document
 * Upload a theater document
 */
router.post('/theater-document', [authenticateToken, upload.single('document')], (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No document file provided',
        code: 'NO_FILE'
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/documents/${req.file.filename}`,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: fileInfo
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      message: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/upload/:filename
 * Delete an uploaded file
 */
router.delete('/:filename', [authenticateToken], (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'Invalid filename',
        code: 'INVALID_FILENAME'
      });
    }

    // Try to find and delete the file from possible locations
    const possiblePaths = [
      path.join(uploadsDir, 'images', filename),
      path.join(uploadsDir, 'documents', filename),
      path.join(uploadsDir, filename)
    ];

    let fileDeleted = false;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        fileDeleted = true;
        break;
      }
    }

    if (!fileDeleted) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: 'Internal server error'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB',
        code: 'FILE_TOO_LARGE'
      });
    }
  }
  
  if (error.message === 'Invalid file type') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only images and documents are allowed',
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
});

module.exports = router;