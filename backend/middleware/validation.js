const { validateIP, sanitizeIPList } = require('../services/ipValidationService');

/**
 * Validates single IP analysis request payload
 */
function validateSingleIPRequest(req, res, next) {
  const { ip } = req.body || {};
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "ip". Please provide an IP address to analyze.'
    });
  }

  const validation = validateIP(ip);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  req.validatedIP = validation.ip;
  req.ipMetadata = validation;
  next();
}

/**
 * Validates multiple IP analysis request payload
 */
function validateMultipleIPRequest(req, res, next) {
  const { ips } = req.body || {};
  if (!ips) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "ips". Please provide a list of IP addresses.'
    });
  }

  const sanitized = sanitizeIPList(ips);
  if (sanitized.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid non-empty IP addresses found in the request.'
    });
  }

  if (sanitized.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Batch limit exceeded. Maximum 50 IP addresses can be analyzed per batch.'
    });
  }

  req.validatedIPList = sanitized;
  next();
}

module.exports = {
  validateSingleIPRequest,
  validateMultipleIPRequest
};
