/**
 * Authentication Controller with Cookie-Based Tokens & Database-Backed Refresh Tokens
 * 
 * Features:
 * - Access Tokens stored in httpOnly cookies, valid for 15 minutes
 * - Database-backed Refresh Tokens valid for 14 days, stored in PostgreSQL
 * - Automatic deletion of refresh token when invalid, expired, or on logout
 * - Access Token rotation on /api/auth/refresh-token
 * - Authoritative /api/auth/me endpoint reading directly from database
 * - Zero tokens required in localStorage on client
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'tradecore_jwt_super_secret_key_2026_educational';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'tradecore_refresh_token_super_secret_key_2026_educational';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 14; // 14 days

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

const ACCESS_COOKIE_OPTIONS = {
  ...COOKIE_BASE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_BASE_OPTIONS,
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
};

/**
 * Set httpOnly auth cookies on Express response
 */
function setAuthCookies(res, accessToken, refreshToken) {
  if (accessToken) {
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  }
}

/**
 * Clear httpOnly auth cookies on Express response
 */
function clearAuthCookies(res) {
  res.clearCookie('accessToken', { ...COOKIE_BASE_OPTIONS, maxAge: 0 });
  res.clearCookie('refreshToken', { ...COOKIE_BASE_OPTIONS, maxAge: 0 });
}

/**
 * Helper: Generate Access Token and Database-Backed Refresh Token Pair
 */
async function generateTokenPair(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'TRADER',
  };

  // 1. Generate short-lived access token (15 minutes)
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // 2. Generate long-lived refresh token (14 days) with unique UUID jti
  const refreshToken = jwt.sign(
    { userId: user.id, jti: crypto.randomUUID() },
    REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // 3. Persist refresh token in PostgreSQL database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    token: accessToken, // Backward compatibility for legacy tests/clients
  };
}

/**
 * Register a new user
 * Route: POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // 1. Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create user and virtual cash account ($100,000) inside a database transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: 'TRADER',
        },
      });

      // Create virtual starting cash account with $100,000.00
      await tx.cashAccount.create({
        data: {
          userId: user.id,
          initialBalance: 100000.00,
          availableBalance: 100000.00,
          reservedBalance: 0.00,
        },
      });

      return user;
    });

    // 5. Generate dual access & refresh token pair and persist in database
    const tokens = await generateTokenPair(newUser);

    // 6. Set tokens in httpOnly cookies (no need for localStorage!)
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully! $100,000 in virtual funds credited.',
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * User login
 * Route: POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email directly in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { cashAccount: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Clean up any old expired tokens for this user from database
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    }).catch(() => {});

    // Generate dual access & refresh token pair and persist in database
    const tokens = await generateTokenPair(user);

    // Set tokens in httpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      cashAccount: user.cashAccount ? {
        availableBalance: parseFloat(user.cashAccount.availableBalance.toString()),
        reservedBalance: parseFloat(user.cashAccount.reservedBalance.toString()),
        initialBalance: parseFloat(user.cashAccount.initialBalance.toString()),
      } : null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token using database-validated refresh token (Access Token Rotation)
 * Route: POST /api/auth/refresh-token
 */
async function refreshToken(req, res, next) {
  try {
    // Read from cookies first, then body or header
    const token =
      req.cookies?.refreshToken ||
      req.cookies?.tradecore_refresh_token ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'];

    if (!token) {
      return res.status(400).json({
        success: false,
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required.',
      });
    }

    // 1. Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (err) {
      // Deletes itself from database if invalid or expired signature
      await prisma.refreshToken.deleteMany({
        where: { token },
      }).catch(() => {});

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token. Please sign in again.',
      });
    }

    // 2. Query database for this active token and its associated user
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: { cashAccount: true },
        },
      },
    });

    // If token not found in database: already deleted or unknown
    if (!dbToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        code: 'REFRESH_TOKEN_NOT_FOUND',
        message: 'Refresh token is unrecognized or already deleted from database. Please log in.',
      });
    }

    // If token was revoked or has expired past 14 days: delete it immediately from database
    if (dbToken.revoked || new Date() > dbToken.expiresAt) {
      await prisma.refreshToken.deleteMany({
        where: { token },
      }).catch(() => {});

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Refresh token has expired or is invalid and has been deleted from the database. Please sign in again.',
      });
    }

    const user = dbToken.user;
    if (!user) {
      await prisma.refreshToken.deleteMany({
        where: { token },
      }).catch(() => {});

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: 'Associated user account no longer exists.',
      });
    }

    // 3. ACCESS TOKEN ROTATION: Issue a fresh new access token valid for 15 minutes
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'TRADER',
    };

    const newAccessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Rotate access token cookie
    res.cookie('accessToken', newAccessToken, ACCESS_COOKIE_OPTIONS);

    // Clean up any stale expired tokens in database
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Access token rotated successfully via cookie.',
      accessToken: newAccessToken,
      token: newAccessToken,
      refreshToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * User logout - Deletes the refresh token from the database and clears cookies
 * Route: POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const token =
      req.cookies?.refreshToken ||
      req.cookies?.tradecore_refresh_token ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'];

    // Deletes the refresh token record from PostgreSQL database
    if (token) {
      await prisma.refreshToken.deleteMany({
        where: { token },
      }).catch(() => {});
    }

    if (req.user?.id) {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id },
      }).catch(() => {});
    }

    // Clear httpOnly cookies from browser
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Tokens deleted from database and cookies cleared.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile directly from PostgreSQL database
 * Route: GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        cashAccount: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found in database.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        cashAccount: user.cashAccount ? {
          availableBalance: parseFloat(user.cashAccount.availableBalance.toString()),
          reservedBalance: parseFloat(user.cashAccount.reservedBalance.toString()),
          initialBalance: parseFloat(user.cashAccount.initialBalance.toString()),
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
};
