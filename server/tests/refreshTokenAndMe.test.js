/**
 * Tests for Refresh Tokens, Database Persistence, Deletion, Cookies, and /me Endpoint
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Database Refresh Tokens, Cookies & /me Endpoint Tests', () => {
  const userEmail = 'jwt_test_user@tradecore.io';
  let accessToken = '';
  let refreshToken = '';
  let cookieHeader = [];

  before(async () => {
    await prisma.user.deleteMany({
      where: { email: userEmail },
    });
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: { email: userEmail },
    });
    await prisma.$disconnect();
  });

  test('POST /api/auth/register generates access and refresh tokens, sets httpOnly cookies, and stores refresh token for 14 days in PostgreSQL', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Token Test User',
        email: userEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    // Verify cookies are set
    cookieHeader = res.headers['set-cookie'];
    assert.ok(cookieHeader, 'Must set cookies on response');
    assert.ok(cookieHeader.some((c) => c.includes('accessToken')));
    assert.ok(cookieHeader.some((c) => c.includes('refreshToken')));
    assert.ok(cookieHeader.some((c) => c.includes('HttpOnly')));

    // Verify refresh token is actually in PostgreSQL database
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    assert.ok(dbToken, 'Refresh token must be stored in database');
    assert.equal(dbToken.user.email, userEmail);

    // Verify refresh token is valid for 14 days
    const minExpectedExpiry = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
    assert.ok(dbToken.expiresAt > minExpectedExpiry, 'Refresh token must be valid for 14 days');
  });

  test('GET /api/auth/me authenticates via httpOnly cookie (no header) and returns fresh user data directly from database', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieHeader);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, userEmail);
    assert.equal(res.body.user.role, 'TRADER');
    assert.equal(res.body.user.cashAccount.availableBalance, 100000.00);
  });

  test('POST /api/auth/refresh-token rotates access token and returns new access cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', cookieHeader)
      .send({ refreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.accessToken);
    assert.equal(res.body.user.email, userEmail);

    // Verify access token rotation in cookies
    const newCookies = res.headers['set-cookie'];
    assert.ok(newCookies);
    assert.ok(newCookies.some((c) => c.includes('accessToken')));

    // Verify new access token works on /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', newCookies);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, userEmail);
  });

  test('POST /api/auth/logout deletes refresh token from database and clears cookies', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader)
      .send({ refreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify token was deleted from database
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    assert.equal(dbToken, null, 'Refresh token must be deleted from database on logout');

    // Verify cookies were cleared (max-age=0 or expires in past)
    const clearedCookies = res.headers['set-cookie'];
    assert.ok(clearedCookies);
    assert.ok(clearedCookies.some((c) => c.includes('accessToken') && (c.includes('Max-Age=0') || c.includes('expires='))));
    assert.ok(clearedCookies.some((c) => c.includes('refreshToken') && (c.includes('Max-Age=0') || c.includes('expires='))));
  });

  test('POST /api/auth/refresh-token rejects deleted/invalid refresh token and cleans up', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
