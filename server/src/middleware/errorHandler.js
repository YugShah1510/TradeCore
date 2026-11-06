/**
 * Centralized Error Handling Middleware
 * 
 * Catches unhandled errors and returns consistent, clean JSON responses.
 */

function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // Prisma unique constraint violation code is P2002
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with that unique value already exists.',
    });
  }

  // Prisma record not found code is P2025
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'The requested resource was not found.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;

