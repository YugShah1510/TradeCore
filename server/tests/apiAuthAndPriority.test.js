/**
 * TradeCore Auth and Price-Time Priority Integration Tests
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const matchingEngine = require('../src/services/matchingEngine');

describe('Auth & Price-Time Priority Tests', () => {
  const testEmail = 'new_student@test.com';

  before(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, 'buyer1@test.com', 'buyer2@test.com', 'seller1@test.com'] } },
    });
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, 'buyer1@test.com', 'buyer2@test.com', 'seller1@test.com'] } },
    });
    await prisma.stock.deleteMany({
      where: { symbol: 'TEST_PRIO' },
    });
    await prisma.$disconnect();
  });

  test('POST /api/auth/register creates user with $100,000 virtual cash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Student',
        email: testEmail,
        password: 'password123',
        confirmPassword: 'password123',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testEmail);

    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { cashAccount: true },
    });
    assert.ok(userInDb);
    assert.equal(parseFloat(userInDb.cashAccount.availableBalance.toString()), 100000.00);
  });

  test('POST /api/auth/register rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Student',
        email: testEmail,
        password: 'password123',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  test('POST /api/auth/login succeeds with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.cashAccount.availableBalance, 100000);
  });

  test('Price-Time Priority: Higher bid price executes before lower bid price', async () => {
    // Isolated stock for priority testing
    const stock = await prisma.stock.upsert({
      where: { symbol: 'TEST_PRIO' },
      update: { currentPrice: 400.00, previousClose: 400.00 },
      create: {
        symbol: 'TEST_PRIO',
        companyName: 'Priority Test Inc',
        currentPrice: 400.00,
        previousClose: 400.00,
        category: 'Testing',
        volume: 0,
      },
    });

    await prisma.order.deleteMany({
      where: { stockId: stock.id },
    });
    assert.ok(stock);

    // Create Buyer 1 who bids $400 for 5 shares
    const buyer1 = await prisma.user.create({
      data: {
        name: 'Buyer One',
        email: 'buyer1@test.com',
        password: 'dummy',
        cashAccount: { create: { initialBalance: 50000, availableBalance: 50000, reservedBalance: 0 } },
      },
    });

    // Create Buyer 2 who bids $410 for 5 shares (Higher price!)
    const buyer2 = await prisma.user.create({
      data: {
        name: 'Buyer Two',
        email: 'buyer2@test.com',
        password: 'dummy',
        cashAccount: { create: { initialBalance: 50000, availableBalance: 50000, reservedBalance: 0 } },
      },
    });

    // Create Seller who owns 5 shares
    const seller = await prisma.user.create({
      data: {
        name: 'Seller One',
        email: 'seller1@test.com',
        password: 'dummy',
        cashAccount: { create: { initialBalance: 50000, availableBalance: 50000, reservedBalance: 0 } },
        holdings: {
          create: {
            stockId: stock.id,
            quantity: 5,
            reservedQuantity: 0,
            averagePurchasePrice: 390.00,
          },
        },
      },
    });

    // Place Buyer 1 order first ($400)
    await matchingEngine.placeAndMatchOrder({
      userId: buyer1.id,
      stockId: stock.id,
      side: 'BUY',
      quantity: 5,
      limitPrice: 400.00,
    });

    // Place Buyer 2 order second ($410)
    await matchingEngine.placeAndMatchOrder({
      userId: buyer2.id,
      stockId: stock.id,
      side: 'BUY',
      quantity: 5,
      limitPrice: 410.00,
    });

    // Now Seller places SELL order for 5 shares at $395.
    // Price Priority says Buyer 2 ($410) MUST execute before Buyer 1 ($400)!
    const sellResult = await matchingEngine.placeAndMatchOrder({
      userId: seller.id,
      stockId: stock.id,
      side: 'SELL',
      quantity: 5,
      limitPrice: 395.00,
    });

    assert.equal(sellResult.filled, true);
    assert.equal(sellResult.trades.length, 1);

    const executedTrade = sellResult.trades[0];
    // Buyer must be Buyer 2 because of higher price priority ($410 vs $400)
    assert.equal(executedTrade.buyerId, buyer2.id);
    assert.equal(executedTrade.executionPrice, 410.00); // executed at resting order's limit price

    // Buyer 1's order must still be OPEN in the book
    const b1Order = await prisma.order.findFirst({
      where: { userId: buyer1.id },
    });
    assert.equal(b1Order.status, 'OPEN');
    assert.equal(b1Order.filledQuantity, 0);
  });
});

