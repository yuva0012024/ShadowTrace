const express = require('express');
const router = express.Router();
const {
  getHistoryList,
  getSearch,
  getStats,
  deleteSearch
} = require('../controllers/historyController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect all history routes with authentication
router.use(requireAuth);

// GET /api/history/stats (placed first to prevent wildcard match)
router.get('/stats', getStats);

// GET /api/history
router.get('/', getHistoryList);

// GET /api/history/:id
router.get('/:id', getSearch);

// DELETE /api/history/:id
router.delete('/:id', deleteSearch);

module.exports = router;
