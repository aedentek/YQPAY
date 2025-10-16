const mongoose = require('mongoose');

/**
 * QRCodeName Schema
 * Manages QR code names/templates for theaters
 * Used for organizing and categorizing QR codes by seat class and name
 */
const qrCodeNameSchema = new mongoose.Schema({
  // QR Code Name (e.g., "YQ S-1", "YQ-S2", "S-2")
  qrName: {
    type: String,
    required: [true, 'QR code name is required'],
    trim: true,
    maxlength: [100, 'QR code name cannot exceed 100 characters']
  },
  
  // Seat Class (e.g., "YQ001", "YQ002", "S-2", "GENERAL", "VIP", "PREMIUM")
  seatClass: {
    type: String,
    required: [true, 'Seat class is required'],
    trim: true,
    maxlength: [50, 'Seat class cannot exceed 50 characters']
  },
  
  // Description (optional)
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Active status (soft delete support)
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Theater reference (optional - can be used for theater-specific QR names)
  theater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: false,
    index: true
  },
  
  // Normalized name for uniqueness checking (lowercase, no spaces)
  // Format: "{qrName}_{seatClass}".toLowerCase().replace(/\s+/g, '_')
  normalizedName: {
    type: String,
    required: false,  // Will be auto-generated in pre-save middleware
    unique: true,
    lowercase: true,
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'qrcodenames' // Explicitly set collection name
});

/**
 * Indexes for performance optimization
 */
// Compound index for theater-specific queries
qrCodeNameSchema.index({ theater: 1, isActive: 1 });

// Text index for search functionality
qrCodeNameSchema.index({ qrName: 'text', seatClass: 'text', description: 'text' });

/**
 * Pre-save middleware to generate normalized name
 */
qrCodeNameSchema.pre('save', function(next) {
  // Always generate normalizedName if qrName and seatClass exist
  if ((this.isModified('qrName') || this.isModified('seatClass') || !this.normalizedName) && this.qrName && this.seatClass) {
    this.normalizedName = `${this.qrName}_${this.seatClass}`
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, ''); // Remove special characters except _ and -
  }
  next();
});

/**
 * Instance Methods
 */

// Soft delete method
qrCodeNameSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

// Restore method
qrCodeNameSchema.methods.restore = function() {
  this.isActive = true;
  return this.save();
};

/**
 * Static Methods
 */

// Find active QR code names
qrCodeNameSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isActive: true });
};

// Find by theater
qrCodeNameSchema.statics.findByTheater = function(theaterId, includeInactive = false) {
  const filter = { theater: theaterId };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return this.find(filter).sort({ createdAt: -1 });
};

// Search QR code names
qrCodeNameSchema.statics.search = function(query, options = {}) {
  const { 
    theaterId, 
    isActive, 
    page = 1, 
    limit = 10 
  } = options;
  
  const filter = {};
  
  // Add text search if query provided
  if (query && query.trim()) {
    filter.$or = [
      { qrName: { $regex: query, $options: 'i' } },
      { seatClass: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ];
  }
  
  // Add theater filter
  if (theaterId) {
    filter.theater = theaterId;
  }
  
  // Add active status filter
  if (isActive !== undefined) {
    filter.isActive = isActive;
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('theater', 'name');
};

/**
 * Virtual fields
 */

// Full name (qrName + seatClass)
qrCodeNameSchema.virtual('fullName').get(function() {
  return `${this.qrName} (${this.seatClass})`;
});

// Status text
qrCodeNameSchema.virtual('statusText').get(function() {
  return this.isActive ? 'Active' : 'Inactive';
});

/**
 * Transform output (for JSON responses)
 */
qrCodeNameSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Include virtuals in JSON output
    ret.fullName = doc.fullName;
    ret.statusText = doc.statusText;
    return ret;
  }
});

const QRCodeName = mongoose.model('QRCodeName', qrCodeNameSchema);

module.exports = QRCodeName;
