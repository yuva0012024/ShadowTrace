const express = require('express');
const router = express.Router();
const { analyzeSingle, analyzeMultiple } = require('../controllers/analyzeController');
const {
  validateSingleIPRequest,
  validateMultipleIPRequest
} = require('../middleware/validation');
const { analyzeLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect analyze routes with authentication
router.use(requireAuth);

// POST /api/analyze/single
router.post('/single', analyzeLimiter, validateSingleIPRequest, analyzeSingle);

// POST /api/analyze/multiple
router.post('/multiple', analyzeLimiter, validateMultipleIPRequest, analyzeMultiple);

module.exports = router;
