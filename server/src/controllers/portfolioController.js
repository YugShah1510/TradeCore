/**
 * Portfolio Controller
 * 
 * Computes portfolio metrics:
 * - Available Cash, Reserved Cash
 * - Current Holdings Value = Sum(quantity * currentPrice)
 * - Total Portfolio Value = Available Cash + Reserved Cash + Holdings Value
 * - Unrealized P&L = Sum((currentPrice - averagePurchasePrice) * quantity)
 * - Realized P&L from completed sell trades
 */

const prisma = require('../config/prisma');

/**
 * Get portfolio summary metrics and holdings breakdown
 * Route: GET /api/portfolio
 */
async function getPortfolioSummary(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Fetch cash account
    const cashAccount = await prisma.cashAccount.findUnique({
      where: { userId },
    });

    const availableCash = cashAccount ? parseFloat(cashAccount.availableBalance.toString()) : 0;
    const reservedCash = cashAccount ? parseFloat(cashAccount.reservedBalance.toString()) : 0;
    const initialCash = cashAccount ? parseFloat(cashAccount.initialBalance.toString()) : 100000;

    // 2. Fetch all portfolio holdings (where quantity > 0)
    const rawHoldings = await prisma.portfolioHolding.findMany({
      where: {
        userId,
        quantity: { gt: 0 },
      },
      include: {
        stock: true,
      },
      orderBy: { quantity: 'desc' },
    });

    let totalHoldingsValue = 0;
    let totalUnrealizedPnL = 0;

    const formattedHoldings = rawHoldings.map((h) => {
      const currentPrice = parseFloat(h.stock.currentPrice.toString());
      const avgPrice = parseFloat(h.averagePurchasePrice.toString());
      const qty = h.quantity;
      const reserved = h.reservedQuantity;
      const availableQty = qty - reserved;
      const holdingValue = parseFloat((qty * currentPrice).toFixed(2));
      const costBasis = parseFloat((qty * avgPrice).toFixed(2));
      const pnl = parseFloat((holdingValue - costBasis).toFixed(2));
      const pnlPercent = costBasis > 0 ? parseFloat(((pnl / costBasis) * 100).toFixed(2)) : 0;

      totalHoldingsValue += holdingValue;
      totalUnrealizedPnL += pnl;

      return {
        id: h.id,
        stockId: h.stockId,
        symbol: h.stock.symbol,
        companyName: h.stock.companyName,
        category: h.stock.category,
        quantity: qty,
        reservedQuantity: reserved,
        availableQuantity: availableQty,
        averagePurchasePrice: avgPrice,
        currentPrice,
        holdingValue,
        costBasis,
        unrealizedPnL: pnl,
        unrealizedPnLPercent: pnlPercent,
      };
    });

    totalHoldingsValue = parseFloat(totalHoldingsValue.toFixed(2));
    totalUnrealizedPnL = parseFloat(totalUnrealizedPnL.toFixed(2));

    // Portfolio Value = Available Cash + Reserved Cash + Holdings Value
    const totalPortfolioValue = parseFloat((availableCash + reservedCash + totalHoldingsValue).toFixed(2));
    const totalPnL = parseFloat((totalPortfolioValue - initialCash).toFixed(2));
    const totalPnLPercent = initialCash > 0 ? parseFloat(((totalPnL / initialCash) * 100).toFixed(2)) : 0;

    // 3. Compute Realized Profit/Loss from user's sell trades
    // For each sell trade: (executionPrice - averagePurchasePriceAtTimeOfSale) * tradeQuantity
    // We can compute this from user's sold trades:
    const soldTrades = await prisma.trade.findMany({
      where: { sellerId: userId },
      include: { stock: true },
    });

    let realizedPnL = 0;
    for (const trade of soldTrades) {
      // Find matching holding to get cost basis or use averagePurchasePrice if available
      const execPrice = parseFloat(trade.executionPrice.toString());
      // A conservative estimate: if user bought before selling, compare against holding avg or trade cost
      // For precision, we calculate total proceeds minus original purchase cost
      const holding = rawHoldings.find((h) => h.stockId === trade.stockId);
      const costPerShare = holding ? parseFloat(holding.averagePurchasePrice.toString()) : execPrice;
      const profitPerShare = execPrice - costPerShare;
      realizedPnL += profitPerShare * trade.quantity;
    }
    realizedPnL = parseFloat(realizedPnL.toFixed(2));

    // Add portfolio allocation percentages to each holding
    const holdingsWithAllocation = formattedHoldings.map((h) => {
      const allocation = totalPortfolioValue > 0
        ? parseFloat(((h.holdingValue / totalPortfolioValue) * 100).toFixed(2))
        : 0;
      return {
        ...h,
        allocationPercent: allocation,
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalPortfolioValue,
        availableCash,
        reservedCash,
        totalCash: parseFloat((availableCash + reservedCash).toFixed(2)),
        holdingsValue: totalHoldingsValue,
        initialCash,
        totalPnL,
        totalPnLPercent,
        unrealizedPnL: totalUnrealizedPnL,
        realizedPnL,
        holdingsCount: holdingsWithAllocation.length,
      },
      holdings: holdingsWithAllocation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's stock holdings only
 * Route: GET /api/portfolio/holdings
 */
async function getPortfolioHoldings(req, res, next) {
  try {
    const userId = req.user.id;

    const holdings = await prisma.portfolioHolding.findMany({
      where: {
        userId,
        quantity: { gt: 0 },
      },
      include: {
        stock: true,
      },
      orderBy: { quantity: 'desc' },
    });

    const formatted = holdings.map((h) => ({
      id: h.id,
      stockId: h.stockId,
      symbol: h.stock.symbol,
      companyName: h.stock.companyName,
      quantity: h.quantity,
      reservedQuantity: h.reservedQuantity,
      availableQuantity: h.quantity - h.reservedQuantity,
      averagePurchasePrice: parseFloat(h.averagePurchasePrice.toString()),
      currentPrice: parseFloat(h.stock.currentPrice.toString()),
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      holdings: formatted,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPortfolioSummary,
  getPortfolioHoldings,
};

