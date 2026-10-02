const rateLimit = require('express-rate-limit');

/**
 * Standard API rate limiter to protect geolocation API quotas and server stability
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Limit each IP to 120 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  }
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 lookups per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  }
});

module.exports = {
  apiLimiter,
  analyzeLimiter
};
