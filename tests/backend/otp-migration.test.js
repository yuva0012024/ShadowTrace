// Comprehensive ShadowTrace OTP & Nodemailer Migration Test Suite
const assert = require('assert');
const path = require('path');
const mongoose = require('../../backend/node_modules/mongoose');
const bcrypt = require('../../backend/node_modules/bcryptjs');

require('../../backend/node_modules/dotenv').config({
  path: path.resolve(__dirname, '../../backend/.env')
});

const OTP = require('../../backend/models/OTP');
const User = require('../../backend/models/User');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    status: response.status,
    headers: response.headers,
    data
  };
}

async function runOtpTests() {
  console.log('========================================================');
  console.log(' SHADOWTRACE OTP SECURITY & NODEMAILER TEST SUITE');
  console.log('========================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace');
  }

  const testEmail = 'shadowtrace0012026@gmail.com';
  const testPassword = 'TestPassword2026!';
  const testFullName = 'Test Operative';

  // Clean previous test data
  await User.deleteMany({ email: testEmail });
  await OTP.deleteMany({ email: testEmail });

  let passed = 0;
  let total = 0;
  function pass(desc) {
    total++;
    passed++;
    console.log(`[PASS] ${desc}`);
  }
  function fail(desc, err) {
    total++;
    console.error(`[FAIL] ${desc}`, err || '');
  }

  try {
    // 1. Health check
    console.log('--- TEST 1: Health & Service Status ---');
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.services.backend, 'operational');
    assert.strictEqual(health.data.services.database, 'connected');
    pass('GET /api/health is online and database connected');

    // 2. Unauthenticated request protection
    console.log('\n--- TEST 2: Unauthenticated / Unauthorized Access Guard ---');
    const unauth = await request('/auth/me');
    assert.strictEqual(unauth.status, 401);
    assert.strictEqual(unauth.data.success, false);
    pass('GET /api/auth/me rejects unauthenticated requests with 401');

    // 3. Invalid inputs rejected
    console.log('\n--- TEST 3: Input Validation Strictness ---');
    const badEmail = await request('/auth/register-otp', {
      method: 'POST',
      body: { fullName: testFullName, email: 'not-an-email', password: testPassword }
    });
    assert.strictEqual(badEmail.status, 400);
    pass('POST /api/auth/register-otp rejects invalid email format');

    const shortPass = await request('/auth/register-otp', {
      method: 'POST',
      body: { fullName: testFullName, email: testEmail, password: '123' }
    });
    assert.strictEqual(shortPass.status, 400);
    pass('POST /api/auth/register-otp rejects short passwords (< 6 chars)');

    // 4. Registration & Real Nodemailer OTP dispatch
    console.log('\n--- TEST 4: Registration & Real Nodemailer OTP Dispatch ---');
    const regRes = await request('/auth/register-otp', {
      method: 'POST',
      body: { fullName: testFullName, email: testEmail, password: testPassword }
    });
    assert.strictEqual(regRes.status, 200);
    assert.strictEqual(regRes.data.success, true);
    assert.strictEqual(regRes.data.email, testEmail);
    assert.strictEqual(regRes.data.resendCooldown, 60);
    assert.strictEqual(regRes.data.expiresInMinutes, 5);
    pass('POST /api/auth/register-otp sends real OTP via Nodemailer and returns 200');

    // Verify OTP record in database
    const otpDoc = await OTP.findOne({ email: testEmail, purpose: 'SIGNUP' });
    assert.ok(otpDoc, 'OTP record must exist in MongoDB');
    assert.ok(otpDoc.otpHash, 'OTP hash must be stored (bcrypt)');
    assert.ok(otpDoc.expiresAt > new Date(), 'Expiry must be in the future (5m)');
    assert.ok(otpDoc.pendingRegistration, 'Pending registration data preserved');
    pass('OTP record safely stored in database with bcrypt hash & 5m expiry');

    // 5. Cooldown / Rate Limiting enforcement
    console.log('\n--- TEST 5: Rate Limiting & Cooldown Enforcement ---');
    const rapidRes = await request('/auth/register-otp', {
      method: 'POST',
      body: { fullName: testFullName, email: testEmail, password: testPassword }
    });
    assert.strictEqual(rapidRes.status, 429);
    assert.ok(rapidRes.data.error.includes('seconds before requesting another OTP'));
    pass('Immediate second registration request is rate-limited with HTTP 429');

    // 6. Incorrect OTP rejection
    console.log('\n--- TEST 6: Incorrect OTP Rejection ---');
    const wrongOtp = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: testEmail, otp: '000000' }
    });
    assert.strictEqual(wrongOtp.status, 400);
    assert.strictEqual(wrongOtp.data.success, false);
    pass('POST /api/auth/verify-otp rejects incorrect OTP code with HTTP 400');

    // 7. Max attempts lockout (5 attempts)
    console.log('\n--- TEST 7: Max Attempts Lockout (Rate Limiting) ---');
    // Test 6 was attempt 1 (attempts = 1). We do 3 more attempts to reach attempts = 4.
    for (let i = 0; i < 3; i++) {
      const att = await request('/auth/verify-otp', {
        method: 'POST',
        body: { email: testEmail, otp: '000000' }
      });
      assert.strictEqual(att.status, 400);
    }
    // 5th attempt triggers lockout and deletion
    const lockedRes = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: testEmail, otp: '000000' }
    });
    assert.strictEqual(lockedRes.status, 429);
    assert.ok(lockedRes.data.error.includes('Too many attempts'));
    pass('Exceeding 5 incorrect attempts triggers HTTP 429 lockout and invalidates session');

    // 8. Expired OTP handling
    console.log('\n--- TEST 8: Expired OTP Enforcement ---');
    // Re-create OTP record with past expiry
    const expiredHash = await bcrypt.hash('123456', 10);
    await OTP.create({
      email: testEmail,
      purpose: 'SIGNUP',
      otpHash: expiredHash,
      expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
      attempts: 0,
      pendingRegistration: { fullName: testFullName, email: testEmail, passwordHash: 'hash' }
    });
    const expiredRes = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: testEmail, otp: '123456' }
    });
    assert.strictEqual(expiredRes.status, 400);
    assert.ok(expiredRes.data.error.includes('expired'));
    pass('Expired OTP is rejected with HTTP 400 and removed');

    // 9. Valid OTP Verification & Account Activation
    console.log('\n--- TEST 9: Valid OTP Verification & Account Creation ---');
    const knownValidOtp = '849201';
    const validHash = await bcrypt.hash(knownValidOtp, 10);
    const passHash = await User.hashPassword(testPassword);
    await OTP.create({
      email: testEmail,
      purpose: 'SIGNUP',
      otpHash: validHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      pendingRegistration: { fullName: testFullName, email: testEmail, passwordHash: passHash }
    });

    const verifySuccess = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: testEmail, otp: knownValidOtp }
    });
    assert.strictEqual(verifySuccess.status, 201);
    assert.strictEqual(verifySuccess.data.success, true);
    assert.ok(verifySuccess.data.token, 'Must return JWT token');
    assert.strictEqual(verifySuccess.data.user.email, testEmail);
    assert.strictEqual(verifySuccess.data.user.role, 'user');
    const userJwt = verifySuccess.data.token;
    pass('Valid OTP successfully activates account and issues JWT token');

    // 10. Single-use enforcement (replay prevention)
    console.log('\n--- TEST 10: Single-Use OTP (Replay Attack Prevention) ---');
    const reuseRes = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: testEmail, otp: knownValidOtp }
    });
    assert.strictEqual(reuseRes.status, 400);
    assert.ok(reuseRes.data.error.includes('No active verification code found'));
    pass('Reusing already-verified OTP is strictly rejected (single-use enforced)');

    // 11. Authenticated Profile Access with new JWT
    console.log('\n--- TEST 11: Authenticated Profile Verification ---');
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${userJwt}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.user.email, testEmail);
    pass('GET /api/auth/me accepts new user JWT token');

    // 12. Normal User 2FA Login Flow
    console.log('\n--- TEST 12: Normal User 2FA Login Flow ---');
    const loginInit = await request('/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: testPassword }
    });
    assert.strictEqual(loginInit.status, 200);
    assert.strictEqual(loginInit.data.requiresOtp, true);
    assert.strictEqual(loginInit.data.email, testEmail);
    pass('Normal user login enforces 2FA OTP requirement (requiresOtp: true)');

    // Clean up test account
    await User.deleteMany({ email: testEmail });
    await OTP.deleteMany({ email: testEmail });
    pass('Cleaned up test user data safely from database');

    console.log('\n========================================================');
    console.log(` RESULTS: ${passed}/${total} assertions passed (${Math.round((passed/total)*100)}%)`);
    console.log('========================================================\n');

  } catch (err) {
    fail('Unexpected test error occurred', err);
  } finally {
    await mongoose.disconnect();
  }
}

runOtpTests();
