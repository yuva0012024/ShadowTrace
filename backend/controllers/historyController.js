const {
  getHistory,
  getSearchById,
  getDashboardStats
} = require('../services/historyService');
const Search = require('../models/Search');
const IPRecord = require('../models/IPRecord');

/**
 * Get search history sessions for authenticated user with optional filter & pagination
 * GET /api/history
 */
async function getHistoryList(req, res, next) {
  try {
    const { query = '', page = 1, limit = 50 } = req.query;
    const historyData = await getHistory({
      userId: req.user._id,
      query: String(query),
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50
    });

    res.status(200).json({
      success: true,
      ...historyData
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single search session by ID or Search Number (verifying user ownership)
 * GET /api/history/:id
 */
async function getSearch(req, res, next) {
  try {
    const { id } = req.params;
    const search = await getSearchById(id, req.user._id, req.user.role);

    if (!search) {
      return res.status(404).json({
        success: false,
        error: `Search record "${id}" not found or unauthorized.`
      });
    }

    res.status(200).json({
      success: true,
      data: search
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get dashboard intelligence statistics for authenticated user
 * GET /api/history/stats
 */
async function getStats(req, res, next) {
  try {
    const stats = await getDashboardStats(req.user._id);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a search record and its associated IP records (verifying user ownership)
 * DELETE /api/history/:id
 */
async function deleteSearch(req, res, next) {
  try {
    const { id } = req.params;
    const search = await getSearchById(id, req.user._id, req.user.role);
    if (!search) {
      return res.status(404).json({
        success: false,
        error: `Search record "${id}" not found or unauthorized.`
      });
    }

    await Promise.all([
      Search.findByIdAndDelete(search._id),
      IPRecord.deleteMany({ searchId: search._id })
    ]);

    res.status(200).json({
      success: true,
      message: `Search session ${search.searchNumber} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHistoryList,
  getSearch,
  getStats,
  deleteSearch
};
