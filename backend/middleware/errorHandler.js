/**
 * Centralized application error handling middleware.
 * Ensures clean, informative JSON responses without leaking internal stack traces.
 */
function errorHandler(err, req, res, next) {
  // Log internal error on server console for debugging
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Check for Geolocation service failure
  if (err.code === 'GEOLOCATION_SERVICE_UNAVAILABLE') {
    return res.status(503).json({
      success: false,
      error: 'GEOLOCATION_SERVICE_UNAVAILABLE',
      message: 'IP location service is temporarily unavailable.'
    });
  }

  // Check for MongoDB / Mongoose connection or timeout errors
  const isMongoError =
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongooseServerSelectionError' ||
    (err.name === 'MongooseError' && typeof err.message === 'string' && err.message.includes('buffering timed out')) ||
    (typeof err.message === 'string' && (
      err.message.includes('buffering timed out') ||
      err.message.includes('ECONNREFUSED 127.0.0.1:27017') ||
      err.message.includes('ECONNREFUSED localhost:27017')
    ));

  if (isMongoError) {
    return res.status(503).json({
      success: false,
      error: 'Database service is temporarily unavailable.'
    });
  }

  // Explicit status code handling
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  if (statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }

  if (statusCode === 500 && (!err.message || err.name === 'Error')) {
    return res.status(500).json({
      success: false,
      error: 'ShadowTrace server encountered an internal error.'
    });
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Something went wrong. Please try again.'
  });
}

/**
 * 404 Handler for unmatched routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Requested service was not found.'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
