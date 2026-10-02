const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const apiConfig = require('../config/api');
const { sendVerificationOTP } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');

/**
 * Generate a signed JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      userId: user._id.toString(),
      role: user.role
    },
    apiConfig.auth.jwtSecret,
    { expiresIn: apiConfig.auth.jwtExpiresIn }
  );
}

/**
 * Partially mask an email address for secure, zero-leak display (e.g. u***@gmail.com)
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email || '';
  }
  const [local, domain] = email.split('@');
  if (local.length <= 1) {
    return `${local}***@${domain}`;
  }
  return `${local[0]}***@${domain}`;
}

/**
 * Cryptographically secure 6-digit numeric OTP generator (never Math.random)
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Validates email format and domain syntax strictly
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) return false;
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const domainParts = parts[1].split('.');
  if (domainParts.some((part) => part.length === 0)) return false;
  return true;
}

/**
 * Determine trusted user role strictly on backend. Normal users cannot request ADMIN.
 */
function determineUserRole(cleanEmail) {
  const configuredAdmin = (process.env.ADMIN_EMAIL || apiConfig.auth.adminEmail || 'admin@shadowtrace.local').toLowerCase();
  if (cleanEmail === configuredAdmin) {
    return 'admin';
  }
  return 'user';
}

/**
 * POST /api/auth/register-otp
 * Step 1 of OTP Registration: Validate inputs, generate 6-digit crypto OTP, send real email
 */
async function sendRegistrationOTP(req, res, next) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your full name.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid operative email address format.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters in length.'
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Check for active resend cooldown on existing OTP (60s rate limit)
    const existingOTP = await OTP.findOne({ email: cleanEmail, purpose: 'SIGNUP' });
    if (existingOTP && existingOTP.resendAvailableAt > new Date()) {
      const remainingSeconds = Math.ceil((existingOTP.resendAvailableAt - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${remainingSeconds} seconds before requesting another OTP.`
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = generateSecureOTP();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const passwordHash = await User.hashPassword(password);

    // Invalidate any previous OTP for this email
    await OTP.deleteMany({ email: cleanEmail });

    // 5-minute expiry; 60-second resend cooldown
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);

    const newOTP = new OTP({
      email: cleanEmail,
      purpose: 'SIGNUP',
      otpHash,
      expiresAt,
      resendAvailableAt,
      attempts: 0,
      pendingRegistration: {
        fullName: fullName.trim(),
        email: cleanEmail,
        passwordHash
      }
    });

    await newOTP.save();

    // Send real OTP email via Nodemailer to the exact user email
    try {
      await sendVerificationOTP(cleanEmail, otpCode, fullName.trim(), 'SIGNUP');
    } catch (emailErr) {
      console.error('[ShadowTrace Auth] Failed to dispatch signup OTP email:', emailErr.message);
      // Clean up failed OTP record so user can retry immediately without being blocked
      await OTP.deleteMany({ email: cleanEmail });
      const code = emailErr.code || 'EMAIL_SEND_FAILED';
      const clientMessage = emailErr.message || 'Unable to send verification email. Please try again.';
      return res.status(500).json({
        success: false,
        code,
        error: clientMessage
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email.',
      email: cleanEmail,
      maskedEmail: maskEmail(cleanEmail),
      resendCooldown: 60,
      expiresInMinutes: 5
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-otp
 * Step 2 of OTP Registration: Verify 6-digit code, create user account, generate JWT
 */
async function verifyRegistrationOTP(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and 6-digit verification code are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code.'
      });
    }

    const otpRecord = await OTP.findOne({ email: cleanEmail, purpose: 'SIGNUP' });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active verification code found for this email. Please register again.'
      });
    }

    // Check expiry (5 minutes)
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(400).json({
        success: false,
        error: 'Verification code expired. Request a new code.'
      });
    }

    // Check attempt limit (max 5)
    if (otpRecord.attempts >= 5) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please request a new code.'
      });
    }

    // Compare OTP hash using bcrypt
    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await OTP.deleteMany({ email: cleanEmail });
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Please request a new code.'
        });
      }
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code.'
      });
    }

    // Prevent race duplicate user registration
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Normal signup MUST always create role = "user"
    const role = 'user';

    // Create user from pending registration
    const newUser = new User({
      fullName: otpRecord.pendingRegistration?.fullName || 'Operative',
      email: cleanEmail,
      passwordHash: otpRecord.pendingRegistration?.passwordHash,
      role,
      isActive: true,
      lastLoginAt: new Date()
    });

    const savedUser = await newUser.save();

    // Invalidate OTP after successful verification (single-use)
    await OTP.deleteMany({ email: cleanEmail });

    // Emit initial welcome security notification
    await createNotification(
      savedUser._id,
      'security',
      'Clearance Initialized',
      'Your email was verified and operative clearance has been activated.',
      { email: cleanEmail }
    );

    const token = generateToken(savedUser);

    res.status(201).json({
      success: true,
      message: 'Account verified and registered successfully.',
      token,
      user: savedUser.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Step 1 of Secure 2FA Login: Verify account credentials, generate crypto OTP, dispatch real email
 * IMPORTANT: Correct OTP is REQUIRED. Do NOT issue JWT before OTP verification!
 */
async function login(req, res, next) {
  try {
    const { email, password, isAdminLogin } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are both required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email not registered.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account inactive.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // 1. ADMIN DIRECT AUTHENTICATION - STRICTLY NO OTP
    if (user.role === 'admin') {
      user.lastLoginAt = new Date();
      await user.save();

      await createNotification(
        user._id,
        'login',
        'Administrator Clearance Authenticated',
        `Administrator session authenticated directly at ${new Date().toLocaleTimeString()} UTC.`
      );

      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        requiresOtp: false,
        token,
        user: user.toJSON(),
        message: 'Administrator authentication successful.'
      });
    }

    // 2. If attempting to log in via Admin Access tab without admin role
    if (isAdminLogin) {
      return res.status(403).json({
        success: false,
        error: 'Administrator access denied.'
      });
    }

    // 3. NORMAL USER LOGIN - TWO-FACTOR AUTHENTICATION WITH REAL EMAIL OTP
    const existingOTP = await OTP.findOne({ email: cleanEmail, purpose: 'LOGIN' });
    if (existingOTP && existingOTP.resendAvailableAt > new Date()) {
      const remainingSeconds = Math.ceil((existingOTP.resendAvailableAt - new Date()) / 1000);
      return res.status(200).json({
        success: true,
        requiresOtp: true,
        email: cleanEmail,
        maskedEmail: maskEmail(cleanEmail),
        resendCooldown: remainingSeconds,
        message: 'Verification code sent.'
      });
    }

    const otpCode = generateSecureOTP();
    const otpHash = await bcrypt.hash(otpCode, 10);

    // Invalidate previous OTP for this email
    await OTP.deleteMany({ email: cleanEmail });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60s cooldown

    const newOTP = new OTP({
      email: cleanEmail,
      purpose: 'LOGIN',
      otpHash,
      expiresAt,
      resendAvailableAt,
      attempts: 0
    });

    await newOTP.save();

    try {
      await sendVerificationOTP(cleanEmail, otpCode, user.fullName, 'LOGIN');
    } catch (emailErr) {
      console.error('[ShadowTrace Auth] Failed to dispatch login OTP email:', emailErr.message);
      await OTP.deleteMany({ email: cleanEmail });
      const code = emailErr.code || 'EMAIL_SEND_FAILED';
      const clientMessage = emailErr.message || 'Unable to send verification email. Please try again.';
      return res.status(500).json({
        success: false,
        code,
        error: clientMessage
      });
    }

    res.status(200).json({
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      maskedEmail: maskEmail(cleanEmail),
      resendCooldown: 60,
      message: 'Verification code sent.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-login-otp
 * Step 2 of Secure 2FA Login: Verify 6-digit OTP, issue authenticated session JWT
 */
async function verifyLoginOTP(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Operative email and 6-digit verification code are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code.'
      });
    }

    const otpRecord = await OTP.findOne({ email: cleanEmail, purpose: 'LOGIN' });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active login verification code found for this email. Please log in again.'
      });
    }

    // Check expiry (5 minutes)
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(400).json({
        success: false,
        error: 'Verification code expired. Request a new code.'
      });
    }

    // Check attempt limit (max 5)
    if (otpRecord.attempts >= 5) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please log in again.'
      });
    }

    // Compare OTP hash using bcrypt
    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await OTP.deleteMany({ email: cleanEmail });
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Please log in again.'
        });
      }
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code.'
      });
    }

    // User authenticated successfully!
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(404).json({
        success: false,
        error: 'Operative profile not found.'
      });
    }

    if (!user.isActive) {
      await OTP.deleteMany({ email: cleanEmail });
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Invalidate OTP (single-use)
    await OTP.deleteMany({ email: cleanEmail });

    // Create session notification
    await createNotification(
      user._id,
      'login',
      'Operative Session Authenticated',
      `Clearance session authenticated successfully on ${new Date().toLocaleTimeString()} UTC.`
    );

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/resend-otp
 * Resend a new OTP with rate limiting and cooldown enforcement (60 seconds)
 */
async function resendRegistrationOTP(req, res, next) {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const query = { email: cleanEmail };
    if (purpose && ['SIGNUP', 'LOGIN'].includes(purpose)) {
      query.purpose = purpose;
    }

    const otpRecord = await OTP.findOne(query);
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active verification session found for this email. Please initiate clearance again.'
      });
    }

    if (otpRecord.resendAvailableAt > new Date()) {
      const waitSeconds = Math.ceil((otpRecord.resendAvailableAt - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting another code.`
      });
    }

    const otpCode = generateSecureOTP();
    const otpHash = await bcrypt.hash(otpCode, 10);

    otpRecord.otpHash = otpHash;
    otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    otpRecord.resendAvailableAt = new Date(Date.now() + 60 * 1000);
    otpRecord.attempts = 0;
    await otpRecord.save();

    let recipientName = 'Operative';
    if (otpRecord.purpose === 'SIGNUP') {
      recipientName = otpRecord.pendingRegistration?.fullName || 'Operative';
    } else {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        recipientName = existingUser.fullName;
      }
    }

    try {
      await sendVerificationOTP(cleanEmail, otpCode, recipientName, otpRecord.purpose);
    } catch (emailErr) {
      console.error('[ShadowTrace Auth] Failed to resend OTP email:', emailErr.message);
      const code = emailErr.code || 'EMAIL_SEND_FAILED';
      const clientMessage = emailErr.message || 'Unable to send verification email. Please try again.';
      return res.status(500).json({
        success: false,
        code,
        error: clientMessage
      });
    }

    res.status(200).json({
      success: true,
      message: 'New verification code dispatched.',
      resendCooldown: 60
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/signup
 * Direct registration endpoint (backward compatible with tests & direct registration)
 */
async function signup(req, res, next) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your full name.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address format.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters in length.'
      });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Normal signup MUST always create role = "user"
    const role = 'user';

    const newUser = new User({
      fullName: fullName.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      isActive: true,
      lastLoginAt: new Date()
    });

    const savedUser = await newUser.save();

    await createNotification(
      savedUser._id,
      'security',
      'Clearance Initialized',
      'Your ShadowTrace operative clearance was initialized successfully.',
      { email: cleanEmail }
    );

    const token = generateToken(savedUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: savedUser.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Invalidate or acknowledge session signout
 */
async function logout(req, res) {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: req.user.toJSON()
  });
}

/**
 * POST /api/auth/request-otp
 * Unified OTP request endpoint (accepts { email, purpose: 'LOGIN' | 'SIGNUP' })
 */
async function requestOTP(req, res, next) {
  try {
    const { email, purpose = 'LOGIN' } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address format.'
      });
    }

    req.body.email = cleanEmail;

    if (purpose === 'SIGNUP') {
      return sendRegistrationOTP(req, res, next);
    } else {
      return login(req, res, next);
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signup,
  sendRegistrationOTP,
  verifyRegistrationOTP,
  resendRegistrationOTP,
  login,
  verifyLoginOTP,
  requestOTP,
  logout,
  getMe,
  maskEmail
};
