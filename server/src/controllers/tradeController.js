/**
 * Trade History Controller
 * 
 * Provides trade records from the perspective of the authenticated user.
 * Each canonical trade indicates whether the user acted as buyer or seller.
 */

const prisma = require('../config/prisma');

/**
 * Get trade history for authenticated user
 * Route: GET /api/trades
 */
async function getUserTrades(req, res, next) {
  try {
    const userId = req.user.id;
    const { side, symbol, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // Build query conditions
    const where = {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    };

    if (symbol) {
      where.stock = { symbol: symbol.toUpperCase() };
    }

    if (side) {
      if (side.toUpperCase() === 'BUY') {
        where.buyerId = userId;
        delete where.OR;
      } else if (side.toUpperCase() === 'SELL') {
        where.sellerId = userId;
        delete where.OR;
      }
    }

    const [total, trades] = await Promise.all([
      prisma.trade.count({ where }),
      prisma.trade.findMany({
        where,
        include: {
          stock: {
            select: {
              symbol: true,
              companyName: true,
            },
          },
        },
        orderBy: { executedAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    // Format trades from the perspective of the authenticated user
    const formattedTrades = trades.map((t) => {
      const isBuyer = t.buyerId === userId;
      const userSide = isBuyer ? 'BUY' : 'SELL';
      const orderId = isBuyer ? t.buyOrderId : t.sellOrderId;
      const execPrice = parseFloat(t.executionPrice.toString());
      const totalVal = parseFloat((execPrice * t.quantity).toFixed(2));

      return {
        id: t.id,
        stockId: t.stockId,
        symbol: t.stock.symbol,
        companyName: t.stock.companyName,
        side: userSide,
        executionPrice: execPrice,
        quantity: t.quantity,
        totalValue: totalVal,
        orderId,
        executedAt: t.executedAt,
      };
    });

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      trades: formattedTrades,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserTrades,
};

