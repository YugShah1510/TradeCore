const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token was provided.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format. Expected: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const secret = process.env.JWT_SECRET || 'tradecore_super_secret_jwt_key_2026_educational_use_only';
    const decoded = jwt.verify(token, secret);
    
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.'
    });
  }
}

module.exports = requireAuth;