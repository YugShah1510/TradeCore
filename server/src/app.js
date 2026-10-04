const express = require('express');
const cors = require('cors');
const prisma = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', async (req, res, next) => {
  try {
    const stockCount = await prisma.stock.count();
    res.status(200).json({
      success: true,
      message: 'TradeCore server is running and database is connected.',
      totalStocksSeeded: stockCount
    });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

module.exports = app;