const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/signup/request-otp', authController.sendRegistrationOTP);
router.post('/signup/verify-otp', authController.verifyRegistrationOTP);
router.post('/register-otp', authController.sendRegistrationOTP);
router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyRegistrationOTP);
router.post('/resend-otp', authController.resendRegistrationOTP);
router.post('/login', authController.login);
router.post('/verify-login-otp', authController.verifyLoginOTP);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
