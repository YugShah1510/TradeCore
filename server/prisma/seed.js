/**
 * TradeCore Database Seed Script
 * 
 * Inserts realistic simulated stocks and historical price data.
 * Safe to run multiple times using upsert operations.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SAMPLE_STOCKS = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    currentPrice: 228.50,
    previousClose: 224.20,
    category: 'Technology',
    volume: 1420500,
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    currentPrice: 415.80,
    previousClose: 412.30,
    category: 'Technology',
    volume: 890400,
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    currentPrice: 138.25,
    previousClose: 135.10,
    category: 'Semiconductors',
    volume: 3200100,
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    currentPrice: 242.60,
    previousClose: 248.90,
    category: 'Automotive',
    volume: 1950300,
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    currentPrice: 186.40,
    previousClose: 184.10,
    category: 'E-Commerce',
    volume: 1120000,
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    currentPrice: 172.90,
    previousClose: 170.50,
    category: 'Technology',
    volume: 980200,
  },
];

// Helper to generate simulated historical prices over the past 30 days
function generatePriceHistory(basePrice, days = 30) {
  const history = [];
  const now = new Date();
  let price = basePrice * 0.92; // start a bit lower 30 days ago

  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Add small random fluctuation (-2% to +2.5%)
    const changePercent = (Math.random() * 4.5 - 2.0) / 100;
    price = Math.max(10, price * (1 + changePercent));

    history.push({
      price: parseFloat(price.toFixed(2)),
      recordedAt: date,
    });
  }

  // Ensure the latest point matches or is very close to basePrice
  history[history.length - 1].price = basePrice;
  return history;
}

const bcrypt = require('bcryptjs');

async function seedMarketMakerLiquidity() {
  console.log('🤖 Seeding market maker liquidity in order books...');
  const mmEmail = 'market_maker@tradecore.test';

  const hashedPassword = await bcrypt.hash('marketmaker123', 8);

  // Upsert Market Maker User
  let mmUser = await prisma.user.findUnique({ where: { email: mmEmail } });
  if (!mmUser) {
    mmUser = await prisma.user.create({
      data: {
        name: 'Simulated Market Maker',
        email: mmEmail,
        password: hashedPassword,
        cashAccount: {
          create: {
            initialBalance: 10000000.00,
            availableBalance: 10000000.00,
            reservedBalance: 0.00,
          },
        },
      },
    });
  }

  const stocks = await prisma.stock.findMany();

  for (const stock of stocks) {
    const price = parseFloat(stock.currentPrice.toString());

    // Give Market Maker stock holdings so they can post asks
    await prisma.portfolioHolding.upsert({
      where: {
        userId_stockId: {
          userId: mmUser.id,
          stockId: stock.id,
        },
      },
      update: {
        quantity: 10000,
      },
      create: {
        userId: mmUser.id,
        stockId: stock.id,
        quantity: 10000,
        reservedQuantity: 0,
        averagePurchasePrice: price,
      },
    });

    // Check existing active orders
    const existingOrdersCount = await prisma.order.count({
      where: { stockId: stock.id, userId: mmUser.id, status: 'OPEN' },
    });

    if (existingOrdersCount === 0) {
      // 3 Bids below market price
      const bidOffsets = [0.005, 0.015, 0.03]; // 0.5%, 1.5%, 3% below
      const bidQuantities = [10, 25, 50];

      for (let i = 0; i < bidOffsets.length; i++) {
        const bidPrice = parseFloat((price * (1 - bidOffsets[i])).toFixed(2));
        await prisma.order.create({
          data: {
            userId: mmUser.id,
            stockId: stock.id,
            side: 'BUY',
            orderType: 'LIMIT',
            limitPrice: bidPrice,
            quantity: bidQuantities[i],
            filledQuantity: 0,
            status: 'OPEN',
          },
        });
      }

      // 3 Asks above market price
      const askOffsets = [0.005, 0.015, 0.03]; // 0.5%, 1.5%, 3% above
      const askQuantities = [10, 25, 50];

      for (let i = 0; i < askOffsets.length; i++) {
        const askPrice = parseFloat((price * (1 + askOffsets[i])).toFixed(2));
        await prisma.order.create({
          data: {
            userId: mmUser.id,
            stockId: stock.id,
            side: 'SELL',
            orderType: 'LIMIT',
            limitPrice: askPrice,
            quantity: askQuantities[i],
            filledQuantity: 0,
            status: 'OPEN',
          },
        });
      }

      console.log(`   📊 Seeded 3 bids and 3 asks for ${stock.symbol}`);
    }
  }
}

async function main() {
  console.log('🌱 Starting TradeCore database seeding...');

  for (const stockData of SAMPLE_STOCKS) {
    const stock = await prisma.stock.upsert({
      where: { symbol: stockData.symbol },
      update: {
        companyName: stockData.companyName,
        currentPrice: stockData.currentPrice,
        previousClose: stockData.previousClose,
        category: stockData.category,
        volume: stockData.volume,
      },
      create: {
        symbol: stockData.symbol,
        companyName: stockData.companyName,
        currentPrice: stockData.currentPrice,
        previousClose: stockData.previousClose,
        category: stockData.category,
        volume: stockData.volume,
      },
    });

    console.log(`✅ Upserted stock: ${stock.symbol} - ${stock.companyName} ($${stock.currentPrice})`);

    // Check if price history exists; if not, populate it
    const existingHistoryCount = await prisma.stockPriceHistory.count({
      where: { stockId: stock.id },
    });

    if (existingHistoryCount === 0) {
      const historyData = generatePriceHistory(stockData.currentPrice, 30);
      await prisma.stockPriceHistory.createMany({
        data: historyData.map((h) => ({
          stockId: stock.id,
          price: h.price,
          recordedAt: h.recordedAt,
        })),
      });
      console.log(`   📈 Seeded 31 historical price points for ${stock.symbol}`);
    }
  }

  // Seed market maker liquidity
  await seedMarketMakerLiquidity();

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

