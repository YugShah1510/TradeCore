/**
 * Analytics Controller
 * 
 * Aggregates trading statistics, execution volume, trade side distribution,
 * most frequently traded stocks, and portfolio performance analytics.
 */

const prisma = require('../config/prisma');

/**
 * Get comprehensive analytics summary
 * Route: GET /api/analytics/summary
 */
async function getAnalyticsSummary(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Fetch user trades
    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: { stock: true },
      orderBy: { executedAt: 'asc' },
    });

    let buyCount = 0;
    let sellCount = 0;
    let totalVolumeTraded = 0;
    let totalValueTraded = 0;
    const stockTradeCounts = {};

    for (const t of trades) {
      const isBuyer = t.buyerId === userId;
      if (isBuyer) buyCount++;
      else sellCount++;

      totalVolumeTraded += t.quantity;
      const val = parseFloat(t.executionPrice.toString()) * t.quantity;
      totalValueTraded += val;

      const sym = t.stock.symbol;
      if (!stockTradeCounts[sym]) {
        stockTradeCounts[sym] = { symbol: sym, companyName: t.stock.companyName, trades: 0, volume: 0, value: 0 };
      }
      stockTradeCounts[sym].trades += 1;
      stockTradeCounts[sym].volume += t.quantity;
      stockTradeCounts[sym].value += val;
    }

    // Top traded stocks
    const topStocks = Object.values(stockTradeCounts)
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 5);

    // 2. Fetch cash and portfolio metrics
    const cashAccount = await prisma.cashAccount.findUnique({ where: { userId } });
    const availableCash = cashAccount ? parseFloat(cashAccount.availableBalance.toString()) : 0;
    const reservedCash = cashAccount ? parseFloat(cashAccount.reservedBalance.toString()) : 0;
    const initialCash = cashAccount ? parseFloat(cashAccount.initialBalance.toString()) : 100000;

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { stock: true },
    });

    let holdingsValue = 0;
    let unrealizedPnL = 0;
    const allocationData = [];

    for (const h of holdings) {
      const currentPrice = parseFloat(h.stock.currentPrice.toString());
      const avgPrice = parseFloat(h.averagePurchasePrice.toString());
      const val = h.quantity * currentPrice;
      const cost = h.quantity * avgPrice;
      holdingsValue += val;
      unrealizedPnL += (val - cost);

      allocationData.push({
        name: h.stock.symbol,
        value: parseFloat(val.toFixed(2)),
        shares: h.quantity,
      });
    }

    // Include available cash in allocation
    if (availableCash + reservedCash > 0) {
      allocationData.push({
        name: 'Cash',
        value: parseFloat((availableCash + reservedCash).toFixed(2)),
        shares: 0,
      });
    }

    const portfolioValue = parseFloat((availableCash + reservedCash + holdingsValue).toFixed(2));
    const totalPnL = parseFloat((portfolioValue - initialCash).toFixed(2));

    // Volume over time (grouped by date)
    const volumeByDate = {};
    for (const t of trades) {
      const d = t.executedAt.toISOString().split('T')[0];
      if (!volumeByDate[d]) volumeByDate[d] = { date: d, volume: 0, trades: 0 };
      volumeByDate[d].volume += t.quantity;
      volumeByDate[d].trades += 1;
    }
    const activityTrend = Object.values(volumeByDate).slice(-14);

    return res.status(200).json({
      success: true,
      stats: {
        totalTrades: trades.length,
        buyOrdersCount: buyCount,
        sellOrdersCount: sellCount,
        totalVolumeTraded,
        totalValueTraded: parseFloat(totalValueTraded.toFixed(2)),
        portfolioValue,
        totalPnL,
        unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
        holdingsValue: parseFloat(holdingsValue.toFixed(2)),
      },
      distribution: [
        { name: 'Buy Trades', value: buyCount, color: '#087A3C' },
        { name: 'Sell Trades', value: sellCount, color: '#DC2626' },
      ],
      allocation: allocationData,
      topStocks,
      activityTrend,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnalyticsSummary,
};

