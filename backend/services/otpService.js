const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const OTP = require('../models/OTP');

/**
 * Generates a cryptographically secure 6-digit numeric OTP (never Math.random)
 * Range: 100000 to 999999
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP code using bcrypt
 */
async function hashOTP(otp) {
  return bcrypt.hash(String(otp).trim(), 10);
}

/**
 * Compares a plain OTP code against a bcrypt hash
 */
async function verifyOTPHash(plainOtp, hash) {
  if (!plainOtp || !hash) return false;
  return bcrypt.compare(String(plainOtp).trim(), hash);
}

/**
 * Creates or updates an active OTP document for an email and purpose.
 * Enforces 5-minute expiration and 60-second resend cooldown.
 */
async function createOTPRecord({ email, purpose = 'SIGNUP', otpCode, pendingRegistration = null }) {
  const cleanEmail = email.trim().toLowerCase();
  const otpHash = await hashOTP(otpCode);

  // Invalidate any existing OTP for this email
  await OTP.deleteMany({ email: cleanEmail });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds

  const otpDoc = new OTP({
    email: cleanEmail,
    purpose,
    otpHash,
    expiresAt,
    resendAvailableAt,
    attempts: 0,
    pendingRegistration: pendingRegistration ? {
      fullName: pendingRegistration.fullName?.trim(),
      email: cleanEmail,
      passwordHash: pendingRegistration.passwordHash
    } : null
  });

  return otpDoc.save();
}

/**
 * Retrieves the active OTP record for an email and purpose
 */
async function findActiveOTP(email, purpose = 'SIGNUP') {
  const cleanEmail = email.trim().toLowerCase();
  return OTP.findOne({ email: cleanEmail, purpose });
}

/**
 * Deletes/invalidates any OTP record for an email
 */
async function invalidateOTP(email) {
  const cleanEmail = email.trim().toLowerCase();
  return OTP.deleteMany({ email: cleanEmail });
}

module.exports = {
  generateSecureOTP,
  hashOTP,
  verifyOTPHash,
  createOTPRecord,
  findActiveOTP,
  invalidateOTP
};
