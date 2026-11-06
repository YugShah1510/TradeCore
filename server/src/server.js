/**
 * Server Entry Point
 * 
 * Loads environment variables, connects to database, and starts the HTTP server.
 */

require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const { startMarketSimulator } = require('./services/marketSimulator');

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    // Verify database connectivity
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully.');

    app.listen(PORT, async () => {
      console.log(`🚀 TradeCore server running on port ${PORT}`);
      console.log(`📡 Base API URL: http://localhost:${PORT}/api`);

      if (process.env.NODE_ENV !== 'test') {
        await startMarketSimulator(3500);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

