const mongoose = require('mongoose');

console.log('🔧 Loading TheaterOrders model (Array-based)...');

// Individual order item schema
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  specialInstructions: String
}, { _id: true });

// Individual order schema (will be stored in array)
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true
  },
  customerInfo: {
    name: { type: String, default: 'Walk-in Customer' },
    phone: String,
    email: String,
    tableNumber: String
  },
  items: [orderItemSchema],
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    currency: { type: String, default: 'INR' }
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'bank_transfer'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled', 'completed'],
    default: 'pending'
  },
  orderType: {
    type: String,
    enum: ['dine_in', 'takeaway', 'delivery'],
    default: 'dine_in'
  },
  // Staff information
  staffInfo: {
    staffId: mongoose.Schema.Types.ObjectId,
    username: String,  // ✅ Actual staff username
    role: String
  },
  source: {
    type: String,
    enum: ['qr_code', 'staff', 'online', 'app'],
    default: 'staff'
  },
  tableNumber: String,
  specialInstructions: String,
  timestamps: {
    placedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    servedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

// Main theater orders collection schema
const theaterOrdersSchema = new mongoose.Schema({
  theater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true,
    unique: true
  },
  orderList: [orderSchema],  // ✅ Array of orders
  metadata: {
    totalOrders: { type: Number, default: 0 },
    pendingOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastOrderDate: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
theaterOrdersSchema.index({ theater: 1 });
theaterOrdersSchema.index({ 'orderList.orderNumber': 1 });
theaterOrdersSchema.index({ 'orderList.status': 1 });
theaterOrdersSchema.index({ 'orderList.createdAt': -1 });

console.log('✅ TheaterOrders schema created with array structure');

module.exports = mongoose.model('TheaterOrders', theaterOrdersSchema, 'theaterorders');
