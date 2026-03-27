const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('./config/loadEnv');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - supports local development and external tunnels (Ngrok, Cloudflare)
const allowedOrigins = [
  'http://localhost:3000', 'http://localhost:3001',
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
  'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178',
  'http://localhost:5179', 'http://localhost:5180'
];

// Add external tunnel URL if configured
if (process.env.EXTERNAL_URL) {
  allowedOrigins.push(process.env.EXTERNAL_URL.replace(/\/$/, ''));
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow configured origins
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      return callback(null, true);
    }

    // Allow ngrok and cloudflare tunnel URLs dynamically
    if (origin.includes('.ngrok') || origin.includes('.ngrok-free.app') ||
        origin.includes('.trycloudflare.com') || origin.includes('.cloudflare') ||
        origin.includes('.loca.lt') || origin.includes('.localtunnel.me')) {
      return callback(null, true);
    }

    // Reject unknown origins in production, allow in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting (skip for admin, auth, and mobile-upload routes)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for these routes
    const skipPaths = [
      '/mobile-upload/',    // Mobile upload polling
      '/admin/',            // Admin routes
      '/auth/login',        // Login endpoints
      '/auth/register',     // Register endpoints
      '/auth/refresh'       // Token refresh
    ];
    return skipPaths.some(path => req.path.includes(path));
  }
});

// Separate stricter rate limiter for auth routes (prevents brute force but allows normal usage)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // 10 attempts per minute
  message: 'Too many login attempts, please try again after 1 minute.',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply auth limiter only to login routes
app.use('/api/electricity/auth/login', authLimiter);
app.use('/api/water/admin/login', authLimiter);
app.use('/api/gas/admin/login', authLimiter);
app.use('/api/municipal/admin/login', authLimiter);
app.use('/api/admin/auth/login', authLimiter);

app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Initialize Database Connection
const { pool } = require('./config/database');

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: '\u2713 Connected'
    });
  } catch (dbError) {
    res.status(503).json({
      status: 'Database Error',
      error: dbError.message,
      environment: process.env.NODE_ENV,
      database: '\u2717 Disconnected'
    });
  }
});

// Routes - Electricity Department
app.use('/api/electricity', require('./routes/electricity/index'));

// Admin routes
app.use('/api/admin', require('./admin/routes/index'));

// Water Department Routes (Separate)
app.use('/api/water', require('./routes/water/index'));

// Gas Distribution Routes (Separate)
app.use('/api/gas', require('./routes/gas/index'));

// Municipal Department Routes
app.use('/api/municipal', require('./routes/municipal/index'));

// Accessibility Routes (for UDID verification and accessibility features)
app.use('/api/accessibility', require('./routes/accessibility/index'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 SUVIDHA Backend Server`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
});

module.exports = app;
