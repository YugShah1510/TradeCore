/**
 * Dashboard Controller
 * 
 * Aggregates all high-level trading metrics, portfolio values,
 * recent trades, active open orders, and market overview for the dashboard.
 */

const prisma = require('../config/prisma');
const { buildCandlestickData } = require('./stockController');

/**
 * Get dashboard summary metrics for authenticated user
 * Route: GET /api/dashboard/summary
 */
async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Fetch cash account
    const cashAccount = await prisma.cashAccount.findUnique({
      where: { userId },
    });
    const availableCash = cashAccount ? parseFloat(cashAccount.availableBalance.toString()) : 0;
    const reservedCash = cashAccount ? parseFloat(cashAccount.reservedBalance.toString()) : 0;
    const initialCash = cashAccount ? parseFloat(cashAccount.initialBalance.toString()) : 100000;

    // 2. Fetch user holdings
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { stock: true },
    });

    let holdingsValue = 0;
    let unrealizedPnL = 0;
    for (const h of holdings) {
      const price = parseFloat(h.stock.currentPrice.toString());
      const avgPrice = parseFloat(h.averagePurchasePrice.toString());
      const value = h.quantity * price;
      const cost = h.quantity * avgPrice;
      holdingsValue += value;
      unrealizedPnL += (value - cost);
    }
    holdingsValue = parseFloat(holdingsValue.toFixed(2));
    unrealizedPnL = parseFloat(unrealizedPnL.toFixed(2));

    const portfolioValue = parseFloat((availableCash + reservedCash + holdingsValue).toFixed(2));
    const totalPnL = parseFloat((portfolioValue - initialCash).toFixed(2));
    const totalPnLPercent = initialCash > 0 ? parseFloat(((totalPnL / initialCash) * 100).toFixed(2)) : 0;

    // 3. Trade and order counts
    const [totalTrades, totalOpenOrders] = await Promise.all([
      prisma.trade.count({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
        },
      }),
    ]);

    // 4. Recent 5 trades for this user
    const recentTradesRaw = await prisma.trade.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: { stock: true },
      orderBy: { executedAt: 'desc' },
      take: 5,
    });

    const recentTrades = recentTradesRaw.map((t) => {
      const isBuyer = t.buyerId === userId;
      return {
        id: t.id,
        symbol: t.stock.symbol,
        side: isBuyer ? 'BUY' : 'SELL',
        price: parseFloat(t.executionPrice.toString()),
        quantity: t.quantity,
        totalValue: parseFloat((parseFloat(t.executionPrice.toString()) * t.quantity).toFixed(2)),
        executedAt: t.executedAt,
      };
    });

    // 5. Recent 5 open orders for this user
    const openOrdersRaw = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      include: { stock: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const openOrders = openOrdersRaw.map((o) => ({
      id: o.id,
      symbol: o.stock.symbol,
      side: o.side,
      limitPrice: parseFloat(o.limitPrice.toString()),
      quantity: o.quantity,
      filledQuantity: o.filledQuantity,
      remainingQuantity: o.quantity - o.filledQuantity,
      status: o.status,
      createdAt: o.createdAt,
    }));

    // 6. Popular / featured stocks with price changes
    const stocks = await prisma.stock.findMany({
      orderBy: { volume: 'desc' },
      take: 6,
    });

    const popularStocks = stocks.map((s) => {
      const current = parseFloat(s.currentPrice.toString());
      const prev = parseFloat(s.previousClose.toString());
      const change = parseFloat((current - prev).toFixed(2));
      const changePercent = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
      return {
        id: s.id,
        symbol: s.symbol,
        companyName: s.companyName,
        currentPrice: current,
        change,
        changePercent,
        volume: s.volume,
      };
    });

    // 7. Get price chart data for the first popular stock (e.g., AAPL)
    const featuredSymbol = popularStocks.length > 0 ? popularStocks[0].symbol : 'AAPL';
    const featuredStock = stocks.find((s) => s.symbol === featuredSymbol);
    let chartData = [];
    if (featuredStock) {
      const histories = await prisma.stockPriceHistory.findMany({
        where: { stockId: featuredStock.id },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      });
      chartData = buildCandlestickData(histories.reverse(), featuredStock, '1D');
    }

    return res.status(200).json({
      success: true,
      summary: {
        availableCash,
        reservedCash,
        holdingsValue,
        portfolioValue,
        initialCash,
        totalPnL,
        totalPnLPercent,
        unrealizedPnL,
        totalTrades,
        totalOpenOrders,
      },
      featuredSymbol,
      chartData,
      recentTrades,
      openOrders,
      popularStocks,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary,
};

