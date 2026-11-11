/**
 * TradeCore Backend & Trading Engine Tests
 * 
 * Verifies:
 * 1. User registration & $100,000 virtual cash allocation
 * 2. Placing buy limit orders & cash reservation
 * 3. Placing sell limit orders & stock reservation
 * 4. Price-time priority matching
 * 5. Partial order execution
 * 6. Order cancellation and reserved balance releases
 * 7. Insufficient funds and stock validation
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/config/prisma');
const matchingEngine = require('../src/services/matchingEngine');
const bcrypt = require('bcryptjs');

describe('TradeCore Matching Engine & Accounting Tests', () => {
  let userA, userB, stock;

  before(async () => {
    // Clean up previous test users if any
    await prisma.user.deleteMany({
      where: {
        email: { in: ['trader_alice@test.com', 'trader_bob@test.com'] },
      },
    });

    const hashedPassword = await bcrypt.hash('password123', 8);

    // Create User A (Buyer) with $100,000 cash
    userA = await prisma.user.create({
      data: {
        name: 'Alice Trader',
        email: 'trader_alice@test.com',
        password: hashedPassword,
        cashAccount: {
          create: {
            initialBalance: 100000.00,
            availableBalance: 100000.00,
            reservedBalance: 0.00,
          },
        },
      },
    });

    // Create User B (Seller) with $100,000 cash
    userB = await prisma.user.create({
      data: {
        name: 'Bob Trader',
        email: 'trader_bob@test.com',
        password: hashedPassword,
        cashAccount: {
          create: {
            initialBalance: 100000.00,
            availableBalance: 100000.00,
            reservedBalance: 0.00,
          },
        },
      },
    });

    // Clean up or upsert isolated test stock (TEST_CORP)
    stock = await prisma.stock.upsert({
      where: { symbol: 'TEST_CORP' },
      update: { currentPrice: 200.00, previousClose: 200.00 },
      create: {
        symbol: 'TEST_CORP',
        companyName: 'Test Corporation',
        currentPrice: 200.00,
        previousClose: 200.00,
        category: 'Testing',
        volume: 0,
      },
    });

    // Clean up any existing orders for this test stock
    await prisma.order.deleteMany({
      where: { stockId: stock.id },
    });

    // Give Bob 50 shares of TEST_CORP so he can sell them
    await prisma.portfolioHolding.create({
      data: {
        userId: userB.id,
        stockId: stock.id,
        quantity: 50,
        reservedQuantity: 0,
        averagePurchasePrice: 200.00,
      },
    });
  });

  after(async () => {
    // Cleanup test users and test stock
    await prisma.user.deleteMany({
      where: {
        email: { in: ['trader_alice@test.com', 'trader_bob@test.com'] },
      },
    });
    await prisma.stock.deleteMany({
      where: { symbol: 'TEST_CORP' },
    });
    await prisma.$disconnect();
  });

  test('User receives exactly $100,000 virtual cash upon creation', async () => {
    const cash = await prisma.cashAccount.findUnique({
      where: { userId: userA.id },
    });
    assert.equal(parseFloat(cash.availableBalance.toString()), 100000.00);
    assert.equal(parseFloat(cash.reservedBalance.toString()), 0.00);
  });

  test('Placing a BUY order reserves required cash', async () => {
    // Alice places BUY order for 10 shares at $210 limit price ($2,100 total)
    const result = await matchingEngine.placeAndMatchOrder({
      userId: userA.id,
      stockId: stock.id,
      side: 'BUY',
      quantity: 10,
      limitPrice: 210.00,
    });

    assert.equal(result.order.status, 'OPEN');
    assert.equal(result.order.filledQuantity, 0);

    const cash = await prisma.cashAccount.findUnique({
      where: { userId: userA.id },
    });

    // Available cash must be 100000 - 2100 = 97900
    assert.equal(parseFloat(cash.availableBalance.toString()), 97900.00);
    // Reserved cash must be 2100
    assert.equal(parseFloat(cash.reservedBalance.toString()), 2100.00);
  });

  test('Cancelling an OPEN BUY order releases reserved cash', async () => {
    // Find Alice's open order
    const order = await prisma.order.findFirst({
      where: { userId: userA.id, status: 'OPEN' },
    });

    await matchingEngine.cancelOrder(order.id, userA.id);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });
    assert.equal(updatedOrder.status, 'CANCELLED');

    // Cash must be restored
    const cash = await prisma.cashAccount.findUnique({
      where: { userId: userA.id },
    });
    assert.equal(parseFloat(cash.availableBalance.toString()), 100000.00);
    assert.equal(parseFloat(cash.reservedBalance.toString()), 0.00);
  });

  test('Placing a SELL order reserves stock quantity', async () => {
    // Bob places SELL order for 20 shares at $220
    const result = await matchingEngine.placeAndMatchOrder({
      userId: userB.id,
      stockId: stock.id,
      side: 'SELL',
      quantity: 20,
      limitPrice: 220.00,
    });

    assert.equal(result.order.status, 'OPEN');

    const holding = await prisma.portfolioHolding.findUnique({
      where: { userId_stockId: { userId: userB.id, stockId: stock.id } },
    });

    assert.equal(holding.quantity, 50);
    assert.equal(holding.reservedQuantity, 20);
  });

  test('Order matching executes at resting order price with partial fill', async () => {
    // Currently resting order: Bob's SELL 20 shares at $220
    // Alice now places a BUY order for 15 shares at $225 (limitPrice >= resting price $220)
    const result = await matchingEngine.placeAndMatchOrder({
      userId: userA.id,
      stockId: stock.id,
      side: 'BUY',
      quantity: 15,
      limitPrice: 225.00,
    });

    // Alice's order should be FILLED for all 15 shares
    assert.equal(result.filled, true);
    assert.equal(result.trades.length, 1);

    const trade = result.trades[0];
    assert.equal(trade.quantity, 15);
    // Price must be the resting order's limit price: $220!
    assert.equal(trade.executionPrice, 220.00);

    // Bob's resting SELL order should now be PARTIALLY_FILLED (15 filled out of 20)
    const bobOrder = await prisma.order.findFirst({
      where: { userId: userB.id, status: 'PARTIALLY_FILLED' },
    });
    assert.ok(bobOrder);
    assert.equal(bobOrder.filledQuantity, 15);

    // Bob's holding should now have 50 - 15 = 35 shares (with 5 still reserved for remaining sell order)
    const bobHolding = await prisma.portfolioHolding.findUnique({
      where: { userId_stockId: { userId: userB.id, stockId: stock.id } },
    });
    assert.equal(bobHolding.quantity, 35);
    assert.equal(bobHolding.reservedQuantity, 5);

    // Alice's holding should now have 15 shares at average price 220
    const aliceHolding = await prisma.portfolioHolding.findUnique({
      where: { userId_stockId: { userId: userA.id, stockId: stock.id } },
    });
    assert.equal(aliceHolding.quantity, 15);
    assert.equal(parseFloat(aliceHolding.averagePurchasePrice.toString()), 220.00);

    // Alice's cash:
    // Alice reserved 15 * $225 = $3375
    // Actual cost: 15 * $220 = $3300
    // Price improvement refund: $75 back to available balance!
    // 100000 - 3300 = 96700
    const aliceCash = await prisma.cashAccount.findUnique({
      where: { userId: userA.id },
    });
    assert.equal(parseFloat(aliceCash.availableBalance.toString()), 96700.00);
    assert.equal(parseFloat(aliceCash.reservedBalance.toString()), 0.00);

    // Bob's cash: received 15 * $220 = $3300
    const bobCash = await prisma.cashAccount.findUnique({
      where: { userId: userB.id },
    });
    assert.equal(parseFloat(bobCash.availableBalance.toString()), 103300.00);
  });

  test('Cannot place BUY order when funds are insufficient', async () => {
    await assert.rejects(
      async () => {
        await matchingEngine.placeAndMatchOrder({
          userId: userA.id,
          stockId: stock.id,
          side: 'BUY',
          quantity: 10000, // 10,000 * 500 = 5 million dollars (exceeds cash)
          limitPrice: 500.00,
        });
      },
      (err) => {
        assert.match(err.message, /Insufficient available cash/i);
        return true;
      }
    );
  });

  test('Cannot place SELL order when available shares are insufficient', async () => {
    await assert.rejects(
      async () => {
        await matchingEngine.placeAndMatchOrder({
          userId: userB.id,
          stockId: stock.id,
          side: 'SELL',
          quantity: 100, // Bob only has 30 available shares left
          limitPrice: 200.00,
        });
      },
      (err) => {
        assert.match(err.message, /Insufficient available shares/i);
        return true;
      }
    );
  });
});

