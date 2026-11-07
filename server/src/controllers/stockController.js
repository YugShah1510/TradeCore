/**
 * Stock Controller
 * 
 * Provides simulated market data, stock listings, historical price points,
 * and current top-of-book (best bid/ask) quotes.
 */

const prisma = require('../config/prisma');

/**
 * Get all available stocks with search and filter capabilities
 * Route: GET /api/stocks
 */
async function getAllStocks(req, res, next) {
  try {
    const { search, category } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { symbol: { contains: search.toUpperCase() } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category && category !== 'All') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    const stocks = await prisma.stock.findMany({
      where,
      orderBy: { symbol: 'asc' },
    });

    // Format stocks with calculated price changes, percentages, and top-of-book quotes
    const formattedStocks = await Promise.all(
      stocks.map(async (stock) => {
        const current = parseFloat(stock.currentPrice.toString());
        const prev = parseFloat(stock.previousClose.toString());
        const change = parseFloat((current - prev).toFixed(2));
        const changePercent = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;

        const bestBidOrder = await prisma.order.findFirst({
          where: {
            stockId: stock.id,
            side: 'BUY',
            status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
          },
          orderBy: [{ limitPrice: 'desc' }, { createdAt: 'asc' }],
          select: { limitPrice: true },
        });

        const bestAskOrder = await prisma.order.findFirst({
          where: {
            stockId: stock.id,
            side: 'SELL',
            status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
          },
          orderBy: [{ limitPrice: 'asc' }, { createdAt: 'asc' }],
          select: { limitPrice: true },
        });

        return {
          id: stock.id,
          symbol: stock.symbol,
          companyName: stock.companyName,
          currentPrice: current,
          previousClose: prev,
          bestBid: bestBidOrder ? parseFloat(bestBidOrder.limitPrice.toString()) : null,
          bestAsk: bestAskOrder ? parseFloat(bestAskOrder.limitPrice.toString()) : null,
          change,
          changePercent,
          category: stock.category,
          volume: stock.volume,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: formattedStocks.length,
      stocks: formattedStocks,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single stock details by symbol
 * Route: GET /api/stocks/:symbol
 */
async function getStockBySymbol(req, res, next) {
  try {
    const { symbol } = req.params;
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: `Stock symbol "${symbol}" not found.`,
      });
    }

    const current = parseFloat(stock.currentPrice.toString());
    const prev = parseFloat(stock.previousClose.toString());
    const change = parseFloat((current - prev).toFixed(2));
    const changePercent = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;

    // Fetch best bid (highest open buy price)
    const bestBidOrder = await prisma.order.findFirst({
      where: {
        stockId: stock.id,
        side: 'BUY',
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      orderBy: { limitPrice: 'desc' },
      select: { limitPrice: true },
    });

    // Fetch best ask (lowest open sell price)
    const bestAskOrder = await prisma.order.findFirst({
      where: {
        stockId: stock.id,
        side: 'SELL',
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      orderBy: { limitPrice: 'asc' },
      select: { limitPrice: true },
    });

    // Fetch recent 10 trades for this stock
    const recentTrades = await prisma.trade.findMany({
      where: { stockId: stock.id },
      orderBy: { executedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        executionPrice: true,
        quantity: true,
        executedAt: true,
      },
    });

    const bestBid = bestBidOrder ? parseFloat(bestBidOrder.limitPrice.toString()) : null;
    const bestAsk = bestAskOrder ? parseFloat(bestAskOrder.limitPrice.toString()) : null;
    const spread = bestBid && bestAsk ? parseFloat((bestAsk - bestBid).toFixed(2)) : null;

    return res.status(200).json({
      success: true,
      stock: {
        id: stock.id,
        symbol: stock.symbol,
        companyName: stock.companyName,
        currentPrice: current,
        previousClose: prev,
        change,
        changePercent,
        category: stock.category,
        volume: stock.volume,
        bestBid,
        bestAsk,
        spread,
        recentTrades: recentTrades.map((t) => ({
          id: t.id,
          price: parseFloat(t.executionPrice.toString()),
          quantity: t.quantity,
          executedAt: t.executedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get historical price points for a stock for charting
 * Route: GET /api/stocks/:symbol/history
 */
// Helper to format and aggregate raw price histories into authentic OHLC candlestick bars
function buildCandlestickData(priceHistories, stock, range) {
  const isIntraday = range === '1D';
  const now = new Date();
  const currentPrice = parseFloat(stock.currentPrice.toString());
  const prevClose = parseFloat(stock.previousClose.toString());

  if (!priceHistories || priceHistories.length === 0) {
    const candles = [];
    const count = 24;
    let runningPrice = prevClose;
    const step = (currentPrice - prevClose) / count;

    for (let i = 0; i < count; i++) {
      const open = Number(runningPrice.toFixed(2));
      const drift = step + (Math.random() - 0.48) * (currentPrice * 0.003);
      const close = Number(Math.max(1, i === count - 1 ? currentPrice : runningPrice + drift).toFixed(2));
      const wickRange = Math.abs(close - open) + currentPrice * 0.0015;
      const high = Number((Math.max(open, close) + Math.random() * wickRange).toFixed(2));
      const low = Number((Math.min(open, close) - Math.random() * wickRange).toFixed(2));
      const timeOffset = (count - i) * (isIntraday ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000);
      const d = new Date(now.getTime() - timeOffset);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      candles.push({
        timestamp: d,
        date: isIntraday ? `${hours}:${minutes}` : `${d.getMonth() + 1}/${d.getDate()}`,
        time: `${hours}:${minutes}`,
        open,
        high,
        low,
        close,
        price: close,
        volume: Math.floor(Math.random() * 15000) + 2000,
      });

      runningPrice = close;
    }
    return candles;
  }

  // If we have history records, group into ~20-30 chronological candle buckets
  const targetCandles = Math.min(30, Math.max(16, priceHistories.length));
  const startTime = new Date(priceHistories[0].recordedAt).getTime();
  const endTime = new Date(priceHistories[priceHistories.length - 1].recordedAt).getTime();
  const timeSpan = Math.max(1000, endTime - startTime);
  const bucketDuration = timeSpan / targetCandles;

  const buckets = Array.from({ length: targetCandles }, () => []);

  for (const h of priceHistories) {
    const t = new Date(h.recordedAt).getTime();
    let idx = Math.floor((t - startTime) / bucketDuration);
    if (idx >= targetCandles) idx = targetCandles - 1;
    buckets[idx].push({ price: parseFloat(h.price.toString()), time: new Date(h.recordedAt) });
  }

  const candles = [];
  let lastClose = parseFloat(priceHistories[0].price.toString());

  for (let i = 0; i < targetCandles; i++) {
    const bucket = buckets[i];
    const bucketTime = new Date(startTime + (i + 0.5) * bucketDuration);
    const hours = String(bucketTime.getHours()).padStart(2, '0');
    const minutes = String(bucketTime.getMinutes()).padStart(2, '0');
    const label = isIntraday ? `${hours}:${minutes}` : `${bucketTime.getMonth() + 1}/${bucketTime.getDate()}`;

    let open, close, high, low;

    if (bucket.length > 0) {
      open = bucket[0].price;
      close = bucket[bucket.length - 1].price;
      const prices = bucket.map((b) => b.price);
      high = Math.max(...prices);
      low = Math.min(...prices);
      if (high === low) {
        const wick = Math.max(0.04, close * 0.001);
        high = Number((high + Math.random() * wick).toFixed(2));
        low = Number((low - Math.random() * wick).toFixed(2));
      }
    } else {
      open = lastClose;
      const microDrift = (Math.random() - 0.48) * (lastClose * 0.001);
      close = Number((lastClose + microDrift).toFixed(2));
      const wick = Math.max(0.04, close * 0.0015);
      high = Number((Math.max(open, close) + Math.random() * wick).toFixed(2));
      low = Number((Math.min(open, close) - Math.random() * wick).toFixed(2));
    }

    candles.push({
      timestamp: bucketTime,
      date: label,
      time: `${hours}:${minutes}`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      price: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 20000) + 1500,
    });

    lastClose = close;
  }

  return candles;
}

async function getStockHistory(req, res, next) {
  try {
    const { symbol } = req.params;
    const { range = '1M' } = req.query; // 1D, 1W, 1M, 1Y, ALL

    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: `Stock symbol "${symbol}" not found.`,
      });
    }

    // Determine cutoff date based on range
    const now = new Date();
    let startDate = new Date();
    if (range === '1D') {
      startDate.setDate(now.getDate() - 1);
    } else if (range === '1W') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '1M') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (range === '1Y') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0); // ALL
    }

    const priceHistories = await prisma.stockPriceHistory.findMany({
      where: {
        stockId: stock.id,
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const chartData = buildCandlestickData(priceHistories, stock, range);

    return res.status(200).json({
      success: true,
      symbol: stock.symbol,
      range,
      history: chartData,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStocks,
  getStockBySymbol,
  getStockHistory,
  buildCandlestickData,
};

