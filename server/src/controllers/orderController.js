/**
 * Order Controller
 * 
 * Handles order submission, order retrieval with filtering, and order cancellation.
 */

const prisma = require('../config/prisma');
const matchingEngine = require('../services/matchingEngine');

/**
 * Place a new limit order
 * Route: POST /api/orders
 */
async function createOrder(req, res, next) {
  try {
    const { stockId, symbol, side, quantity, limitPrice } = req.body;
    const userId = req.user.id;

    if (!side || !['BUY', 'SELL'].includes(side.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Order side must be BUY or SELL.',
      });
    }

    const parsedQty = parseInt(quantity, 10);
    const parsedPrice = parseFloat(limitPrice);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order quantity must be a positive whole number.',
      });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Limit price must be greater than zero.',
      });
    }

    // Resolve stockId from symbol if stockId was not directly passed
    let targetStockId = stockId;
    if (!targetStockId && symbol) {
      const stock = await prisma.stock.findUnique({
        where: { symbol: symbol.toUpperCase() },
      });
      if (!stock) {
        return res.status(404).json({
          success: false,
          message: `Stock with symbol "${symbol}" not found.`,
        });
      }
      targetStockId = stock.id;
    }

    if (!targetStockId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either stockId or stock symbol.',
      });
    }

    // Call matching engine
    const result = await matchingEngine.placeAndMatchOrder({
      userId,
      stockId: targetStockId,
      side: side.toUpperCase(),
      quantity: parsedQty,
      limitPrice: parsedPrice,
    });

    const finalOrder = result.order;
    const remainingQty = finalOrder.quantity - finalOrder.filledQuantity;

    return res.status(201).json({
      success: true,
      message: result.filled
        ? 'Order filled completely!'
        : result.partiallyFilled
        ? `Order partially filled (${finalOrder.filledQuantity}/${finalOrder.quantity} shares). Remaining rests in order book.`
        : 'Order placed successfully and added to order book.',
      order: {
        id: finalOrder.id,
        stockId: finalOrder.stockId,
        symbol: finalOrder.stock ? finalOrder.stock.symbol : undefined,
        side: finalOrder.side,
        orderType: finalOrder.orderType,
        limitPrice: parseFloat(finalOrder.limitPrice.toString()),
        quantity: finalOrder.quantity,
        filledQuantity: finalOrder.filledQuantity,
        remainingQuantity: remainingQty,
        status: finalOrder.status,
        createdAt: finalOrder.createdAt,
      },
      trades: result.trades,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all orders for the authenticated user
 * Route: GET /api/orders
 */
async function getUserOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const { status, side, symbol, page = 1, limit = 20 } = req.query;

    const where = { userId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (side && ['BUY', 'SELL'].includes(side.toUpperCase())) {
      where.side = side.toUpperCase();
    }

    if (symbol) {
      where.stock = { symbol: symbol.toUpperCase() };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          stock: {
            select: {
              symbol: true,
              companyName: true,
              currentPrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      stockId: o.stockId,
      symbol: o.stock.symbol,
      companyName: o.stock.companyName,
      side: o.side,
      orderType: o.orderType,
      limitPrice: parseFloat(o.limitPrice.toString()),
      quantity: o.quantity,
      filledQuantity: o.filledQuantity,
      remainingQuantity: o.quantity - o.filledQuantity,
      status: o.status,
      createdAt: o.createdAt,
      canCancel: ['OPEN', 'PARTIALLY_FILLED'].includes(o.status),
    }));

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      orders: formattedOrders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get order details by ID
 * Route: GET /api/orders/:id
 */
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        stock: true,
        buyTrades: true,
        sellTrades: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Only allow viewing user's own orders
    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this order.',
      });
    }

    const trades = order.side === 'BUY' ? order.buyTrades : order.sellTrades;

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        stockId: order.stockId,
        symbol: order.stock.symbol,
        companyName: order.stock.companyName,
        side: order.side,
        orderType: order.orderType,
        limitPrice: parseFloat(order.limitPrice.toString()),
        quantity: order.quantity,
        filledQuantity: order.filledQuantity,
        remainingQuantity: order.quantity - order.filledQuantity,
        status: order.status,
        createdAt: order.createdAt,
        canCancel: ['OPEN', 'PARTIALLY_FILLED'].includes(order.status),
        trades: trades.map((t) => ({
          id: t.id,
          executionPrice: parseFloat(t.executionPrice.toString()),
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
 * Cancel an open or partially filled order
 * Route: POST /api/orders/:id/cancel
 */
async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const cancelledOrder = await matchingEngine.cancelOrder(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Reserved funds or shares released.',
      order: {
        id: cancelledOrder.id,
        status: cancelledOrder.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
};

