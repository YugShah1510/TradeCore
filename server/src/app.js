/**
 * Express Application Setup
 * 
 * Configures middleware, security headers, CORS, API routes, and error handling.
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const orderRoutes = require('./routes/orderRoutes');
const orderBookRoutes = require('./routes/orderBookRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing and cookie middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Root guidance endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TradeCore API Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #E6ECF5; color: #1E293B; }
          .card { background: #E6ECF5; padding: 40px; border-radius: 20px; box-shadow: 12px 12px 24px rgba(166, 180, 200, 0.7), -12px -12px 24px rgba(255, 255, 255, 0.9); text-align: center; max-width: 480px; }
          a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #087A3C; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; box-shadow: 4px 4px 10px rgba(8, 122, 60, 0.3); }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>TradeCore API Running</h2>
          <p>Backend services and simulated matching engine are active on port 5001.</p>
          <p>Access the trading terminal frontend here:</p>
          <a href="http://localhost:5173/">Launch TradeCore App (http://localhost:5173)</a>
        </div>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'TradeCore API is running smoothly.',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/order-book', orderBookRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// 404 Handler for undefined API routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;

