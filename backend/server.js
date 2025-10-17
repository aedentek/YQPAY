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

// CORS configuration - Use environment variable and fallbacks
const frontendUrl = process.env.FRONTEND_URL || 'http://192.168.1.7:3001';
app.use(cors({
  origin: [
    frontendUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://127.0.0.1:3001',
    'http://192.168.1.7:3000',
    'http://192.168.1.7:3001',
    'https://192.168.1.7:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
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
  
  // Start expired stock scheduler after DB connection
  const { startExpiredStockScheduler } = require('./jobs/expiredStockScheduler');
  startExpiredStockScheduler();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  console.log('Continuing without MongoDB - some features may not work');
  // Don't exit, allow server to start without DB for testing
});

// ==============================================
// ROUTES
// ==============================================

// Import route modules
const authRoutes = require('./routes/auth');
const theaterRoutes = require('./routes/theaters');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const settingsRoutes = require('./routes/settings');
const uploadRoutes = require('./routes/upload');
const stockRoutes = require('./routes/stock');
const pageAccessRoutes = require('./routes/pageAccess');
const qrCodeRoutes = require('./routes/qrcodes');
const qrCodeNameRoutes = require('./routes/qrcodenames');
const singleQRCodeRoutes = require('./routes/singleqrcodes');
const syncRoutes = require('./routes/sync');
const rolesRoutes = require('./routes/roles');

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

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/theater-products', productRoutes.products);
app.use('/api/theater-categories', productRoutes.categories);
app.use('/api/theater-product-types', productRoutes.productTypes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/theater-stock', stockRoutes);
app.use('/api/page-access', pageAccessRoutes);
app.use('/api/qrcodes', qrCodeRoutes);
app.use('/api/qrcodenames', qrCodeNameRoutes);
app.use('/api/single-qrcodes', singleQRCodeRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/theater-users', require('./routes/theaterUsers'));
app.use('/api/theater-dashboard', require('./routes/theater-dashboard'));

// Default API route
app.get('/api', (req, res) => {
  res.json({
    message: 'YQPayNow Theater Canteen API',
    version: require('./package.json').version,
    endpoints: {
      auth: '/api/auth',
      theaters: '/api/theaters',
      products: '/api/theater-products',
      categories: '/api/theater-categories',
      productTypes: '/api/theater-product-types',
      orders: '/api/orders',
      settings: '/api/settings',
      upload: '/api/upload',
      stock: '/api/theater-stock',
      pageAccess: '/api/page-access',
      qrcodes: '/api/qrcodes',
      sync: '/api/sync',
      health: '/api/health'
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
  
  // MongoDB validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors
    });
  }
  
  // MongoDB duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ==============================================
// SERVER STARTUP
// ==============================================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 YQPayNow Backend Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://${HOST}:${PORT}/api`);
  console.log(`🏥 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server accessible at: http://192.168.1.7:${PORT}/api`);
});

module.exports = app;