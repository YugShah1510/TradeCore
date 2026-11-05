/**
 * TradeCore Order-Matching Engine
 * 
 * Implements a limit order book matching engine with Price-Time Priority:
 * 1. Price Priority: 
 *    - For BUY orders, higher limit prices have priority.
 *    - For SELL orders, lower limit prices have priority.
 * 2. Time Priority:
 *    - At the exact same limit price, earlier orders execute first.
 * 3. Execution Price:
 *    - Trades execute at the resting order's limit price.
 * 4. Partial Fills:
 *    - An order matches as much quantity as available from resting orders.
 *    - Unfilled quantities remain OPEN or PARTIALLY_FILLED in the book.
 * 5. Safe Transactional Accounting:
 *    - Cash and stock quantities are reserved upfront.
 *    - Balances, holdings, and order statuses update atomically in Prisma transactions.
 */

const prisma = require('../config/prisma');

/**
 * Places a limit order and triggers the matching engine.
 * 
 * @param {Object} params
 * @param {string} params.userId - Authenticated user placing the order
 * @param {string} params.stockId - ID of the stock being traded
 * @param {'BUY'|'SELL'} params.side - Order side: BUY or SELL
 * @param {number} params.quantity - Number of shares (positive integer)
 * @param {number} params.limitPrice - Limit price per share (positive number)
 * @returns {Promise<Object>} Created order and execution summary
 */
async function placeAndMatchOrder({ userId, stockId, side, quantity, limitPrice }) {
  // Validate basic parameters
  if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
    throw { statusCode: 400, message: 'Order quantity must be a positive integer.' };
  }
  if (!limitPrice || limitPrice <= 0 || isNaN(limitPrice)) {
    throw { statusCode: 400, message: 'Limit price must be a positive number.' };
  }

  // Fetch the stock
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
  });
  if (!stock) {
    throw { statusCode: 404, message: 'Stock not found.' };
  }

  const orderValue = parseFloat((quantity * limitPrice).toFixed(2));

  // Run initial reservation and order creation inside a transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    if (side === 'BUY') {
      // 1. Verify buyer has enough available cash
      const cashAccount = await tx.cashAccount.findUnique({
        where: { userId },
      });

      if (!cashAccount) {
        throw { statusCode: 400, message: 'User cash account not found.' };
      }

      const availableCash = parseFloat(cashAccount.availableBalance.toString());
      if (availableCash < orderValue) {
        throw {
          statusCode: 400,
          message: `Insufficient available cash. Required: $${orderValue.toLocaleString()}, Available: $${availableCash.toLocaleString()}`,
        };
      }

      // 2. Reserve cash for this BUY order
      await tx.cashAccount.update({
        where: { userId },
        data: {
          availableBalance: { decrement: orderValue },
          reservedBalance: { increment: orderValue },
        },
      });
    } else {
      // side === 'SELL'
      // 1. Verify seller owns enough available shares
      const holding = await tx.portfolioHolding.findUnique({
        where: {
          userId_stockId: { userId, stockId },
        },
      });

      const currentQty = holding ? holding.quantity : 0;
      const reservedQty = holding ? holding.reservedQuantity : 0;
      const availableShares = currentQty - reservedQty;

      if (availableShares < quantity) {
        throw {
          statusCode: 400,
          message: `Insufficient available shares to sell. Required: ${quantity}, Available: ${availableShares}`,
        };
      }

      // 2. Reserve the shares for this SELL order
      await tx.portfolioHolding.update({
        where: { id: holding.id },
        data: {
          reservedQuantity: { increment: quantity },
        },
      });
    }

    // 3. Create the order in the database with status OPEN
    const order = await tx.order.create({
      data: {
        userId,
        stockId,
        side,
        orderType: 'LIMIT',
        limitPrice,
        quantity,
        filledQuantity: 0,
        status: 'OPEN',
      },
    });

    return order;
  });

  // Now run the matching loop to match against existing resting orders
  const executionSummary = await matchOrder(createdOrder.id);

  return executionSummary;
}

/**
 * Matches an active order against resting orders in the book.
 * 
 * @param {string} orderId - ID of the order to match
 * @returns {Promise<Object>} Updated order and list of executed trades
 */
async function matchOrder(orderId) {
  const executedTrades = [];

  // Loop until the order is filled or no more eligible resting orders exist
  while (true) {
    const matchOccurred = await prisma.$transaction(async (tx) => {
      // 1. Fetch current state of the incoming order
      const incoming = await tx.order.findUnique({
        where: { id: orderId },
        include: { stock: true },
      });

      if (!incoming || incoming.status === 'FILLED' || incoming.status === 'CANCELLED') {
        return false;
      }

      const incomingRemaining = incoming.quantity - incoming.filledQuantity;
      if (incomingRemaining <= 0) {
        return false;
      }

      const incomingLimitPrice = parseFloat(incoming.limitPrice.toString());

      // 2. Find the highest priority resting order
      // Price-Time priority logic:
      // If incoming is BUY: resting SELL order with limitPrice <= incomingLimitPrice
      //   Sort by limitPrice ASC, createdAt ASC
      // If incoming is SELL: resting BUY order with limitPrice >= incomingLimitPrice
      //   Sort by limitPrice DESC, createdAt ASC
      let restingOrder = null;

      if (incoming.side === 'BUY') {
        restingOrder = await tx.order.findFirst({
          where: {
            stockId: incoming.stockId,
            side: 'SELL',
            status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
            userId: { not: incoming.userId }, // Prevent self-trading
            limitPrice: { lte: incoming.limitPrice },
          },
          orderBy: [
            { limitPrice: 'asc' },
            { createdAt: 'asc' },
          ],
        });
      } else {
        restingOrder = await tx.order.findFirst({
          where: {
            stockId: incoming.stockId,
            side: 'BUY',
            status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
            userId: { not: incoming.userId }, // Prevent self-trading
            limitPrice: { gte: incoming.limitPrice },
          },
          orderBy: [
            { limitPrice: 'desc' },
            { createdAt: 'asc' },
          ],
        });
      }

      // If no eligible counterpart order is found, stop matching
      if (!restingOrder) {
        return false;
      }

      const restingRemaining = restingOrder.quantity - restingOrder.filledQuantity;
      const matchQty = Math.min(incomingRemaining, restingRemaining);

      // Rule: Execution price is the price of the RESTING order
      const executionPrice = parseFloat(restingOrder.limitPrice.toString());
      const totalTradeValue = parseFloat((matchQty * executionPrice).toFixed(2));

      // Determine buyer and seller
      const isIncomingBuy = incoming.side === 'BUY';
      const buyerId = isIncomingBuy ? incoming.userId : restingOrder.userId;
      const sellerId = isIncomingBuy ? restingOrder.userId : incoming.userId;
      const buyOrderId = isIncomingBuy ? incoming.id : restingOrder.id;
      const sellOrderId = isIncomingBuy ? restingOrder.id : incoming.id;
      const buyOrderLimitPrice = isIncomingBuy ? incomingLimitPrice : parseFloat(restingOrder.limitPrice.toString());

      // --- FINANCIAL UPDATES ---

      // 1. Buyer accounting:
      // The buyer originally reserved: matchQty * buyOrderLimitPrice
      // The actual cost is: matchQty * executionPrice
      // If executionPrice < buyOrderLimitPrice, the buyer gets a refund of the difference!
      const buyerReservedToRelease = parseFloat((matchQty * buyOrderLimitPrice).toFixed(2));
      const buyerRefund = parseFloat((buyerReservedToRelease - totalTradeValue).toFixed(2));

      await tx.cashAccount.update({
        where: { userId: buyerId },
        data: {
          reservedBalance: { decrement: buyerReservedToRelease },
          // If execution price was lower than buyer's limit price, return the difference to available cash
          availableBalance: buyerRefund > 0 ? { increment: buyerRefund } : undefined,
        },
      });

      // Update buyer's stock holdings (or create if not owned yet)
      const buyerHolding = await tx.portfolioHolding.findUnique({
        where: {
          userId_stockId: { userId: buyerId, stockId: incoming.stockId },
        },
      });

      if (!buyerHolding) {
        await tx.portfolioHolding.create({
          data: {
            userId: buyerId,
            stockId: incoming.stockId,
            quantity: matchQty,
            reservedQuantity: 0,
            averagePurchasePrice: executionPrice,
          },
        });
      } else {
        const oldQty = buyerHolding.quantity;
        const oldAvg = parseFloat(buyerHolding.averagePurchasePrice.toString());
        const newTotalQty = oldQty + matchQty;
        // Weighted average purchase price formula
        const newAvg = (oldQty * oldAvg + matchQty * executionPrice) / newTotalQty;

        await tx.portfolioHolding.update({
          where: { id: buyerHolding.id },
          data: {
            quantity: newTotalQty,
            averagePurchasePrice: parseFloat(newAvg.toFixed(2)),
          },
        });
      }

      // 2. Seller accounting:
      // Seller reserved matchQty shares. We now deduct them from quantity and reservedQuantity.
      const sellerHolding = await tx.portfolioHolding.findUnique({
        where: {
          userId_stockId: { userId: sellerId, stockId: incoming.stockId },
        },
      });

      if (sellerHolding) {
        await tx.portfolioHolding.update({
          where: { id: sellerHolding.id },
          data: {
            quantity: { decrement: matchQty },
            reservedQuantity: { decrement: matchQty },
          },
        });
      }

      // Credit the seller with the trade proceeds in available cash
      await tx.cashAccount.update({
        where: { userId: sellerId },
        data: {
          availableBalance: { increment: totalTradeValue },
        },
      });

      // 3. Update incoming and resting order filled quantities and statuses
      const newIncomingFilled = incoming.filledQuantity + matchQty;
      const newIncomingStatus = newIncomingFilled >= incoming.quantity ? 'FILLED' : 'PARTIALLY_FILLED';

      await tx.order.update({
        where: { id: incoming.id },
        data: {
          filledQuantity: newIncomingFilled,
          status: newIncomingStatus,
        },
      });

      const newRestingFilled = restingOrder.filledQuantity + matchQty;
      const newRestingStatus = newRestingFilled >= restingOrder.quantity ? 'FILLED' : 'PARTIALLY_FILLED';

      await tx.order.update({
        where: { id: restingOrder.id },
        data: {
          filledQuantity: newRestingFilled,
          status: newRestingStatus,
        },
      });

      // 4. Create Canonical Trade Record
      const trade = await tx.trade.create({
        data: {
          stockId: incoming.stockId,
          buyOrderId,
          sellOrderId,
          buyerId,
          sellerId,
          executionPrice,
          quantity: matchQty,
        },
      });

      // 5. Update stock currentPrice and volume
      await tx.stock.update({
        where: { id: incoming.stockId },
        data: {
          currentPrice: executionPrice,
          volume: { increment: matchQty },
        },
      });

      // Record a new price history point
      await tx.stockPriceHistory.create({
        data: {
          stockId: incoming.stockId,
          price: executionPrice,
        },
      });

      executedTrades.push({
        tradeId: trade.id,
        stockId: incoming.stockId,
        symbol: incoming.stock.symbol,
        executionPrice,
        quantity: matchQty,
        totalValue: totalTradeValue,
        buyerId,
        sellerId,
        executedAt: trade.executedAt,
      });

      return true; // Match was made, continue loop to check if remaining quantity can match more
    });

    if (!matchOccurred) {
      break;
    }
  }

  // Fetch final status of the order
  const finalOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      stock: true,
    },
  });

  return {
    order: finalOrder,
    trades: executedTrades,
    filled: finalOrder ? finalOrder.status === 'FILLED' : false,
    partiallyFilled: finalOrder ? finalOrder.status === 'PARTIALLY_FILLED' : false,
  };
}

/**
 * Cancels an eligible open or partially filled order and releases reserved cash/shares.
 * 
 * @param {string} orderId - ID of order to cancel
 * @param {string} userId - Authenticated user attempting cancellation
 * @returns {Promise<Object>} Cancelled order details
 */
async function cancelOrder(orderId, userId) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { stock: true },
    });

    if (!order) {
      throw { statusCode: 404, message: 'Order not found.' };
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw { statusCode: 403, message: 'You are not authorized to cancel this order.' };
    }

    // Verify order is eligible for cancellation
    if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') {
      throw {
        statusCode: 400,
        message: `Cannot cancel an order with status: ${order.status}. Only OPEN or PARTIALLY_FILLED orders can be cancelled.`,
      };
    }

    const remainingQty = order.quantity - order.filledQuantity;
    if (remainingQty <= 0) {
      throw { statusCode: 400, message: 'No remaining unfilled quantity to cancel.' };
    }

    if (order.side === 'BUY') {
      // Release remaining reserved cash back to available balance
      const limitPrice = parseFloat(order.limitPrice.toString());
      const cashToRelease = parseFloat((remainingQty * limitPrice).toFixed(2));

      await tx.cashAccount.update({
        where: { userId },
        data: {
          reservedBalance: { decrement: cashToRelease },
          availableBalance: { increment: cashToRelease },
        },
      });
    } else {
      // side === 'SELL'
      // Release remaining reserved shares back to available
      await tx.portfolioHolding.update({
        where: {
          userId_stockId: { userId, stockId: order.stockId },
        },
        data: {
          reservedQuantity: { decrement: remainingQty },
        },
      });
    }

    // Mark order as CANCELLED
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
      },
    });

    return updatedOrder;
  });
}

module.exports = {
  placeAndMatchOrder,
  matchOrder,
  cancelOrder,
};

