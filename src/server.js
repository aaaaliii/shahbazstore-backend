import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import reviewRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';
import orderRoutes from './routes/orders.js';
import discountCodeRoutes from './routes/discountCodes.js';
import headerLinkRoutes from './routes/headerLinks.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import uploadRoutes from './routes/upload.js';

// Load env vars
dotenv.config();

// Connect to database (async, but don't block serverless function initialization)
// Connection will be established on first request if not already connected
connectDB().catch(err => {
  console.error('Initial database connection failed:', err.message);
  console.log('Will retry on first request...');
});

// Initialize Elasticsearch if enabled
if (process.env.ELASTICSEARCH_ENABLED === 'true') {
  (async () => {
    try {
      const { testConnection } = await import('./config/elasticsearch.js');
      const { createIndex } = await import('./services/elasticsearchService.js');
      
      const connected = await testConnection();
      if (connected) {
        await createIndex();
        console.log('Elasticsearch initialized successfully');
      } else {
        console.warn('Elasticsearch connection failed. Search will fall back to MongoDB.');
      }
    } catch (error) {
      console.warn('Elasticsearch initialization error:', error.message);
      console.warn('Search will fall back to MongoDB.');
    }
  })();
}

const app = express();

// CORS configuration - optimized for Vercel deployment
// Handle preflight requests FIRST to prevent redirect issues
// This MUST be before any other middleware to catch OPTIONS requests before Vercel redirects them
app.use((req, res, next) => {
  // Handle OPTIONS requests immediately to prevent redirects
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    // Set CORS headers for preflight
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, Referer, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Return 204 immediately without redirect - CRITICAL for Vercel
    return res.status(204).end();
  }
  next();
});

// Also handle OPTIONS with explicit route (backup)
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  // Set CORS headers for preflight
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, Referer, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Return 204 immediately without redirect
  return res.status(204).end();
});

// CORS configuration - allow all origins (for production and development)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    // Allow all origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Referer',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Additional CORS headers for all requests (backup)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers explicitly for all responses
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, Referer, Access-Control-Request-Method, Access-Control-Request-Headers');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure database is connected before handling requests (important for serverless)
app.use(async (req, res, next) => {
  // Skip health check endpoint
  if (req.path === '/api/health') {
    return next();
  }
  
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (error) {
      console.error('Database connection failed in middleware:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again later.'
      });
    }
  }
  next();
});

// Serve static files (only for local development, not needed on Vercel)
// Vercel Blob handles file serving via CDN
if (process.env.VERCEL !== '1') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/discount-codes', discountCodeRoutes);
app.use('/api/header-links', headerLinkRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// 404 handler - must be before error handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Export for Vercel serverless functions
export default app;

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}
