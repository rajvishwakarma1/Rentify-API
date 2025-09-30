// JWT authentication middleware scaffold for Express

const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Auth will fail.');
}

// TODO: integrate token blacklist store (e.g., Redis)
function isTokenBlacklisted(jti) { return false; }

/**
 * Express middleware to verify JWT and attach user to req.user.
 * Adds security headers on success.
 */
function verifyToken(req, res, next) {
  if (!JWT_SECRET) {
    return next(createError({ message: 'Server misconfigured: JWT secret missing', status: 500, type: 'auth' }));
  }
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError({ message: 'No token provided', status: 401, type: 'auth' }));
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(createError({ message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', status: 401, type: 'auth' }));
    }
    // Token blacklist check
    if (decoded && decoded.jti && isTokenBlacklisted(decoded.jti)) {
      return next(createError({ message: 'Token revoked', status: 401, type: 'auth' }));
    }
    req.user = decoded;
    // Security headers for authenticated requests
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    if (decoded && decoded.sub) res.setHeader('X-Authenticated-User-Id', decoded.sub);
    next();
  });
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return next(createError({ message: 'Forbidden', status: 403, type: 'auth' }));
    }
    next();
  };
}

/**
 * Express middleware for optional JWT authentication.
 * If JWT_SECRET is missing, logs a warning and continues without error.
 */
function optionalAuth(req, res, next) {
  if (!JWT_SECRET) {
    logger.warn('JWT_SECRET is not set. Skipping optional authentication.');
    return next();
  }
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) req.user = decoded;
    next();
  });
}

// TODO scaffold for refresh handling (to be implemented later)

module.exports = {
  verifyToken,
  requireRole,
  optionalAuth,
  isTokenBlacklisted
};
