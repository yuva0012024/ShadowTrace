const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');

// All profile endpoints require valid JWT authentication
router.use(requireAuth);

// GET /api/profile
router.get('/', profileController.getProfile);

// PUT /api/profile
router.put('/', profileController.updateProfile);

// POST /api/profile/change-password
router.post('/change-password', profileController.changePassword);

module.exports = router;
