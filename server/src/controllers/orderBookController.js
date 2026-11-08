/**
 * Order Book Controller
 * 
 * Aggregates active limit orders (bids and asks) for a stock at each price level,
 * computes cumulative market depth, and provides recent executions.
 */

const prisma = require('../config/prisma');

/**
 * Get aggregated order book for a given stock symbol
 * Route: GET /api/order-book/:symbol
 */
async function getOrderBookBySymbol(req, res, next) {
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

    // 1. Fetch active BUY orders (Bids)
    const bidOrders = await prisma.order.findMany({
      where: {
        stockId: stock.id,
        side: 'BUY',
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      orderBy: [
        { limitPrice: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // 2. Fetch active SELL orders (Asks)
    const askOrders = await prisma.order.findMany({
      where: {
        stockId: stock.id,
        side: 'SELL',
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      orderBy: [
        { limitPrice: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Helper to aggregate orders by price level
    function aggregateLevels(orders, isBids) {
      const levelMap = new Map();

      for (const order of orders) {
        const price = parseFloat(order.limitPrice.toString());
        const remaining = order.quantity - order.filledQuantity;
        if (remaining <= 0) continue;

        if (levelMap.has(price)) {
          const current = levelMap.get(price);
          current.quantity += order.quantity;
          current.remainingQuantity += remaining;
          current.orderCount += 1;
        } else {
          levelMap.set(price, {
            price,
            quantity: order.quantity,
            remainingQuantity: remaining,
            orderCount: 1,
            totalValue: 0,
            cumulativeDepth: 0,
          });
        }
      }

      // Convert to array
      const levels = Array.from(levelMap.values());
      // Sort: Bids desc, Asks asc
      levels.sort((a, b) => (isBids ? b.price - a.price : a.price - b.price));

      // Calculate cumulative depth
      let cumulative = 0;
      for (const level of levels) {
        cumulative += level.remainingQuantity;
        level.cumulativeDepth = cumulative;
        level.totalValue = parseFloat((level.price * level.remainingQuantity).toFixed(2));
      }

      return levels;
    }

    const bids = aggregateLevels(bidOrders, true);
    const asks = aggregateLevels(askOrders, false);

    const bestBid = bids.length > 0 ? bids[0].price : null;
    const bestAsk = asks.length > 0 ? asks[0].price : null;
    const spread = bestBid && bestAsk ? parseFloat((bestAsk - bestBid).toFixed(2)) : null;

    // Fetch recent 15 trade executions for this stock
    const recentExecutions = await prisma.trade.findMany({
      where: { stockId: stock.id },
      orderBy: { executedAt: 'desc' },
      take: 15,
      select: {
        id: true,
        executionPrice: true,
        quantity: true,
        executedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      stock: {
        id: stock.id,
        symbol: stock.symbol,
        companyName: stock.companyName,
        currentPrice: parseFloat(stock.currentPrice.toString()),
        previousClose: parseFloat(stock.previousClose.toString()),
      },
      bestBid,
      bestAsk,
      spread,
      bids,
      asks,
      recentExecutions: recentExecutions.map((t) => ({
        id: t.id,
        price: parseFloat(t.executionPrice.toString()),
        quantity: t.quantity,
        total: parseFloat((parseFloat(t.executionPrice.toString()) * t.quantity).toFixed(2)),
        executedAt: t.executedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrderBookBySymbol,
};

