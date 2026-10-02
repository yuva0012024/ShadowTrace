const { lookupIP } = require('../services/geolocationService');
const { saveSearchSession } = require('../services/historyService');
const { createNotification } = require('../services/notificationService');

/**
 * Controller for Single IP Analysis
 * POST /api/analyze/single
 */
async function analyzeSingle(req, res, next) {
  try {
    const ip = req.validatedIP;
    const userId = req.user ? req.user._id : null;
    const result = await lookupIP(ip);

    // Save analysis session to MongoDB bound to user
    const session = await saveSearchSession([result], userId);

    if (userId) {
      await createNotification(
        userId,
        'analysis',
        'IP Reconnaissance Completed',
        `Target IP ${ip} resolved to ${result.city || 'Regional Node'}, ${result.country || ''}`.trim(),
        { ip, searchNumber: session.searchNumber }
      );
    }

    res.status(200).json({
      success: true,
      message: 'IP analysis completed successfully.',
      searchId: session._id,
      searchNumber: session.searchNumber,
      searchedAt: session.searchedAt,
      data: session.ipRecords[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for Multiple IP Analysis
 * POST /api/analyze/multiple
 */
async function analyzeMultiple(req, res, next) {
  try {
    const ipList = req.validatedIPList;
    const userId = req.user ? req.user._id : null;
    const successfulRecords = [];
    const errors = [];

    // Process lookups sequentially with a slight tick to respect provider rate limit
    for (const ip of ipList) {
      try {
        const record = await lookupIP(ip);
        successfulRecords.push(record);
      } catch (err) {
        errors.push({
          ip,
          error: err.message || 'Lookup failed'
        });
      }
    }

    if (successfulRecords.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'None of the provided IP addresses could be analyzed.',
        details: errors
      });
    }

    // Save session in MongoDB bound to user
    const session = await saveSearchSession(successfulRecords, userId);

    if (userId) {
      await createNotification(
        userId,
        'batch_analysis',
        'Batch Reconnaissance Completed',
        `Analyzed ${successfulRecords.length} targets successfully (${errors.length} failed).`,
        { total: ipList.length, success: successfulRecords.length, searchNumber: session.searchNumber }
      );
    }

    res.status(200).json({
      success: true,
      message: `Batch analysis completed. Analyzed ${successfulRecords.length} of ${ipList.length} addresses.`,
      searchId: session._id,
      searchNumber: session.searchNumber,
      searchedAt: session.searchedAt,
      totalRequested: ipList.length,
      totalSuccess: successfulRecords.length,
      totalFailed: errors.length,
      data: session.ipRecords,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeSingle,
  analyzeMultiple
};
