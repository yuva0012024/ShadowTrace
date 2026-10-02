const express = require('express');
const router = express.Router();
const { exportSearchData } = require('../controllers/exportController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect export route with authentication
router.use(requireAuth);

// GET /api/export/:id?format=csv|json
router.get('/:id', exportSearchData);

module.exports = router;
