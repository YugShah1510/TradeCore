/**
 * Authentication & Authorization Middleware
 * 
 * Verifies JWT Access Tokens sent in the Authorization header.
 * Attaches the authenticated database user to the request object.
 * Provides role-based access control (RBAC) via authorizeRole middleware.
 */

const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'tradecore_jwt_super_secret_key_2026_educational';

/**
 * Middleware to verify access token and attach user from PostgreSQL database
 */
async function authenticateToken(req, res, next) {
  try {
    // Extract access token from httpOnly cookies first, or Authorization Bearer header
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const token =
      req.cookies?.accessToken ||
      req.cookies?.tradecore_access_token ||
      bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'Access denied. Authentication token is missing.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Your access token has expired. Please refresh your session.',
        });
      }
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Invalid authentication token.',
      });
    }

    // Always fetch fresh user record from PostgreSQL database to ensure account is valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User session is invalid or user no longer exists.',
      });
    }

    // Attach verified database user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication processing error.',
      error: error.message,
    });
  }
}

/**
 * Role-based authorization middleware
 * Example: router.get('/admin', authenticateToken, authorizeRole('ADMIN'), handler)
 */
function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: requires one of the following roles: [${roles.join(', ')}]. Current role: ${req.user.role || 'NONE'}`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRole,
};
