const jwt = require('jsonwebtoken');
const User = require('../models/User');
const apiConfig = require('../config/api');

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header and loads user from MongoDB.
 */
async function requireAuth(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session token provided.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, apiConfig.auth.jwtSecret);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication session. Please log in again.'
      });
    }

    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account inactive.'
      });
    }

    // Attach verified user instance and userId to request object
    req.user = user;
    req.user.userId = user._id.toString();
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Admin Authorization Middleware:
 * Ensures the authenticated user has the 'admin' role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden. Administrator privileges required.'
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
