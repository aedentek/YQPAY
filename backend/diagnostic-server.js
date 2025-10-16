const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// ==============================================
// MIDDLEWARE SETUP
// ==============================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Logging middleware - simplified for development
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==============================================
// DATABASE CONNECTION
// ==============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  console.log('Continuing without MongoDB - some features may not work');
  // Don't exit, allow server to start without DB for testing
});

// ==============================================
// BASIC ROUTES - Testing one by one
// ==============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version
  });
});

// Test import routes one by one
console.log('🔍 Testing route imports...');

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
}

try {
  const theaterRoutes = require('./routes/theaters');
  app.use('/api/theaters', theaterRoutes);
  console.log('✅ Theater routes loaded');
} catch (error) {
  console.error('❌ Theater routes failed:', error.message);
}

try {
  const productRoutes = require('./routes/products');
  app.use('/api/theater-products', productRoutes.products);
  app.use('/api/theater-categories', productRoutes.categories);
  app.use('/api/theater-product-types', productRoutes.productTypes);
  console.log('✅ Product routes loaded');
} catch (error) {
  console.error('❌ Product routes failed:', error.message);
}

try {
  const orderRoutes = require('./routes/orders');
  app.use('/api/orders', orderRoutes);
  console.log('✅ Order routes loaded');
} catch (error) {
  console.error('❌ Order routes failed:', error.message);
}

try {
  const settingsRoutes = require('./routes/settings');
  app.use('/api/settings', settingsRoutes);
  console.log('✅ Settings routes loaded');
} catch (error) {
  console.error('❌ Settings routes failed:', error.message);
}

try {
  const uploadRoutes = require('./routes/upload');
  app.use('/api/upload', uploadRoutes);
  console.log('✅ Upload routes loaded');
} catch (error) {
  console.error('❌ Upload routes failed:', error.message);
}

try {
  const stockRoutes = require('./routes/stock');
  app.use('/api/theater-stock', stockRoutes);
  console.log('✅ Stock routes loaded');  
} catch (error) {
  console.error('❌ Stock routes failed:', error.message);
}

try {
  const pageAccessRoutes = require('./routes/pageAccess');
  app.use('/api/page-access', pageAccessRoutes);
  console.log('✅ Page access routes loaded');
} catch (error) {
  console.error('❌ Page access routes failed:', error.message);
}

try {
  const qrCodeRoutes = require('./routes/qrcodes');
  app.use('/api/qrcodes', qrCodeRoutes);
  console.log('✅ QR code routes loaded');
} catch (error) {
  console.error('❌ QR code routes failed:', error.message);
}

try {
  const syncRoutes = require('./routes/sync');
  app.use('/api/sync', syncRoutes);
  console.log('✅ Sync routes loaded');
} catch (error) {
  console.error('❌ Sync routes failed:', error.message);
}

try {
  const theaterUsersRoutes = require('./routes/theaterUsers');
  app.use('/api/theater-users', theaterUsersRoutes);
  console.log('✅ Theater users routes loaded');
} catch (error) {
  console.error('❌ Theater users routes failed:', error.message);
}

// Default API route
app.get('/api', (req, res) => {
  res.json({
    message: 'YQPayNow Theater Canteen API - Diagnostic Mode',
    version: require('./package.json').version,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      theaters: '/api/theaters'
    }
  });
});

// ==============================================
// ERROR HANDLING
// ==============================================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ==============================================
// SERVER STARTUP
// ==============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 YQPayNow Diagnostic Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;