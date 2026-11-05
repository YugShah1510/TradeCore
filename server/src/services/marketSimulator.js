/**
 * TradeCore Real-Time Market Simulator
 * 
 * Simulates a living, breathing stock exchange by:
 * 1. Generating continuous price fluctuations using Geometric Brownian Motion with Mean Reversion.
 * 2. Updating top-of-book market maker liquidity (bids & asks) around current prices with realistic spreads.
 * 3. Recording high-resolution price history points for intraday charting.
 * 4. Triggering realistic simulated liquidity trades through the matching engine to keep the trade tape active.
 */

const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { placeAndMatchOrder } = require('./matchingEngine');

let simulatorInterval = null;
let tickCount = 0;
let isRunning = false;
let isTicking = false;

// Per-stock volatility and target parameters
const STOCK_PARAMS = {
  NVDA: { vol: 0.0018, trend: 0.015, minTick: 0.02 },
  TSLA: { vol: 0.0022, trend: -0.008, minTick: 0.05 },
  AAPL: { vol: 0.0010, trend: 0.006, minTick: 0.02 },
  MSFT: { vol: 0.0010, trend: 0.005, minTick: 0.03 },
  AMZN: { vol: 0.0012, trend: 0.008, minTick: 0.02 },
  GOOGL: { vol: 0.0011, trend: 0.007, minTick: 0.02 },
};

let marketMakerUser = null;
let algoTraderUser = null;

/**
 * Standard Normal Box-Muller generator
 */
function randomNormal() {
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random() || 0.0001;
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Ensures system liquidity bot accounts exist with sufficient capital and shares.
 */
async function ensureBotAccounts() {
  const hashedPassword = await bcrypt.hash('botpassword123', 8);

  // 1. Market Maker User
  marketMakerUser = await prisma.user.findUnique({
    where: { email: 'market_maker@tradecore.test' },
  });
  if (!marketMakerUser) {
    marketMakerUser = await prisma.user.create({
      data: {
        name: 'Simulated Market Maker',
        email: 'market_maker@tradecore.test',
        password: hashedPassword,
        cashAccount: {
          create: {
            initialBalance: 50000000.0,
            availableBalance: 50000000.0,
            reservedBalance: 0.0,
          },
        },
      },
    });
  } else {
    // Top up MM cash if needed
    await prisma.cashAccount.updateMany({
      where: { userId: marketMakerUser.id },
      data: { availableBalance: 50000000.0, reservedBalance: 0.0 },
    });
  }

  // 2. Algorithmic Liquidity Bot
  algoTraderUser = await prisma.user.findUnique({
    where: { email: 'algo_trader@tradecore.test' },
  });
  if (!algoTraderUser) {
    algoTraderUser = await prisma.user.create({
      data: {
        name: 'Algorithmic Liquidity Bot',
        email: 'algo_trader@tradecore.test',
        password: hashedPassword,
        cashAccount: {
          create: {
            initialBalance: 50000000.0,
            availableBalance: 50000000.0,
            reservedBalance: 0.0,
          },
        },
      },
    });
  } else {
    await prisma.cashAccount.updateMany({
      where: { userId: algoTraderUser.id },
      data: { availableBalance: 50000000.0, reservedBalance: 0.0 },
    });
  }

  // 3. Ensure both bots have generous holdings in every stock
  const allStocks = await prisma.stock.findMany();
  for (const s of allStocks) {
    const price = parseFloat(s.currentPrice.toString());

    await prisma.portfolioHolding.upsert({
      where: { userId_stockId: { userId: marketMakerUser.id, stockId: s.id } },
      update: { quantity: 50000, reservedQuantity: 0 },
      create: {
        userId: marketMakerUser.id,
        stockId: s.id,
        quantity: 50000,
        reservedQuantity: 0,
        averagePurchasePrice: price,
      },
    });

    await prisma.portfolioHolding.upsert({
      where: { userId_stockId: { userId: algoTraderUser.id, stockId: s.id } },
      update: { quantity: 50000, reservedQuantity: 0 },
      create: {
        userId: algoTraderUser.id,
        stockId: s.id,
        quantity: 50000,
        reservedQuantity: 0,
        averagePurchasePrice: price,
      },
    });
  }
}

/**
 * Updates order book quotes for a stock around newPrice
 */
async function refreshMarketMakerQuotes(stockId, newPrice) {
  if (!marketMakerUser) return;

  // Depth offsets: tight spread of ~0.08% - 0.15% at top of book
  const bidOffsets = [0.0006, 0.0025, 0.007];
  const askOffsets = [0.0006, 0.0025, 0.007];
  const quantities = [25, 50, 100];

  const now = new Date();

  // Cancel/delete previous OPEN orders for this stock placed by the MM
  await prisma.order.deleteMany({
    where: {
      userId: marketMakerUser.id,
      stockId,
      status: 'OPEN',
    },
  });

  // Re-create tight multi-level quotes
  const newOrders = [];

  for (let i = 0; i < bidOffsets.length; i++) {
    const bidPrice = Math.max(0.01, parseFloat((newPrice * (1 - bidOffsets[i])).toFixed(2)));
    newOrders.push({
      userId: marketMakerUser.id,
      stockId,
      side: 'BUY',
      orderType: 'LIMIT',
      limitPrice: bidPrice,
      quantity: quantities[i],
      filledQuantity: 0,
      status: 'OPEN',
      createdAt: new Date(now.getTime() + i),
    });
  }

  for (let i = 0; i < askOffsets.length; i++) {
    const askPrice = parseFloat((newPrice * (1 + askOffsets[i])).toFixed(2));
    newOrders.push({
      userId: marketMakerUser.id,
      stockId,
      side: 'SELL',
      orderType: 'LIMIT',
      limitPrice: askPrice,
      quantity: quantities[i],
      filledQuantity: 0,
      status: 'OPEN',
      createdAt: new Date(now.getTime() + i + 10),
    });
  }

  await prisma.order.createMany({
    data: newOrders,
  });
}

/**
 * Executes a single simulation step across all stocks.
 */
async function simulationTick() {
  if (isTicking) return;
  isTicking = true;
  tickCount++;

  try {
    if (!marketMakerUser || !algoTraderUser) {
      await ensureBotAccounts();
    }

    const stocks = await prisma.stock.findMany();

    for (const stock of stocks) {
      const currentPrice = parseFloat(stock.currentPrice.toString());
      const previousClose = parseFloat(stock.previousClose.toString());
      const params = STOCK_PARAMS[stock.symbol] || { vol: 0.0012, trend: 0.005, minTick: 0.02 };

      // Target mean-reversion level
      const targetLevel = previousClose * (1 + params.trend);
      const meanReversionDrift = 0.04 * ((targetLevel - currentPrice) / currentPrice);

      // Random shock
      const shock = params.vol * randomNormal();
      let returnPct = meanReversionDrift + shock;

      let delta = parseFloat((currentPrice * returnPct).toFixed(2));

      // Ensure price visibly ticks (either up or down)
      if (Math.abs(delta) < 0.01) {
        const sign = Math.random() > 0.48 ? 1 : -1;
        delta = sign * params.minTick;
      }

      const newPrice = Math.max(1.0, parseFloat((currentPrice + delta).toFixed(2)));
      const volIncr = Math.floor(Math.random() * 250) + 50;

      // Update Stock record
      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          currentPrice: newPrice,
          volume: { increment: volIncr },
        },
      });

      // Record high-resolution price history point
      await prisma.stockPriceHistory.create({
        data: {
          stockId: stock.id,
          price: newPrice,
          recordedAt: new Date(),
        },
      });

      // Refresh MM quotes around new price
      await refreshMarketMakerQuotes(stock.id, newPrice);
    }

    // Every 4th tick (~14s), trigger a simulated bot trade for realistic tape activity
    if (tickCount % 4 === 0 && algoTraderUser && stocks.length > 0) {
      const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
      const randomSide = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const tradeQty = Math.floor(Math.random() * 15) + 5; // 5 to 20 shares

      // Find best ask (if BUY) or best bid (if SELL)
      const bestCounterOrder = await prisma.order.findFirst({
        where: {
          stockId: randomStock.id,
          side: randomSide === 'BUY' ? 'SELL' : 'BUY',
          status: 'OPEN',
        },
        orderBy: [
          { limitPrice: randomSide === 'BUY' ? 'asc' : 'desc' },
          { createdAt: 'asc' },
        ],
      });

      if (bestCounterOrder) {
        const targetPrice = parseFloat(bestCounterOrder.limitPrice.toString());
        try {
          await placeAndMatchOrder({
            userId: algoTraderUser.id,
            stockId: randomStock.id,
            side: randomSide,
            quantity: tradeQty,
            limitPrice: targetPrice,
          });
        } catch (tradeErr) {
          // Ignore matching exceptions in background simulator
        }
      }
    }

    // Prune excessive history points every 200 ticks (keep database clean)
    if (tickCount % 200 === 0) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await prisma.stockPriceHistory.deleteMany({
        where: {
          recordedAt: { lt: sevenDaysAgo },
        },
      });
    }
  } catch (err) {
    console.error('Market simulator tick error:', err);
  } finally {
    isTicking = false;
  }
}

/**
 * Starts the continuous market simulator background service.
 * @param {number} intervalMs - Milliseconds between ticks (default 3500ms)
 */
async function startMarketSimulator(intervalMs = 3500) {
  if (isRunning) return;

  try {
    console.log('📈 Initializing TradeCore Market Simulator...');
    await ensureBotAccounts();
    isRunning = true;

    // Run first tick immediately
    simulationTick();

    // Start background interval
    simulatorInterval = setInterval(simulationTick, intervalMs);
    console.log(`⚡ Market Simulator active (ticking every ${intervalMs}ms).`);
  } catch (error) {
    console.error('Failed to start Market Simulator:', error);
  }
}

/**
 * Stops the continuous market simulator.
 */
function stopMarketSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  isRunning = false;
  console.log('🛑 Market Simulator stopped.');
}

/**
 * Returns current status of the simulator.
 */
function getSimulatorStatus() {
  return {
    isRunning,
    tickCount,
  };
}

module.exports = {
  startMarketSimulator,
  stopMarketSimulator,
  getSimulatorStatus,
  simulationTick,
};
