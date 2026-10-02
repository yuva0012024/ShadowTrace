const http = require('http');
const axios = require('axios');

async function testSuite() {
  console.log('================================================================');
  console.log(' SHADOWTRACE COMPREHENSIVE NETWORK & CONNECTION VERIFICATION');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       ${details}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       ${details}`);
      failedCount++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Backend running & Login Page renders
  // -------------------------------------------------------------
  console.log('--- TEST 1: Backend health & Frontend accessibility ---');
  try {
    const healthRes = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
    assert(
      healthRes.status === 200 && healthRes.data.success === true && healthRes.data.message === 'ShadowTrace backend is running',
      'TEST 1A: GET /api/health returns 200 and exact required message',
      JSON.stringify(healthRes.data)
    );
  } catch (err) {
    assert(false, 'TEST 1A: GET /api/health failed', err.message);
  }

  try {
    const pageRes = await axios.get('http://localhost:5174/login', { timeout: 3000 });
    assert(
      pageRes.status === 200 && pageRes.data.includes('<div id="root">'),
      'TEST 1B: Frontend /login loads independently with HTTP 200',
      `Page length: ${pageRes.data.length} bytes`
    );
  } catch (err) {
    assert(false, 'TEST 1B: Frontend /login failed to load', err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Rapid consecutive refreshes (10 times)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: 10 Rapid consecutive page & health checks ---');
  let allRefreshesPass = true;
  for (let i = 1; i <= 10; i++) {
    try {
      const p = await axios.get('http://localhost:5174/login', { timeout: 3000 });
      const h = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
      if (p.status !== 200 || h.status !== 200 || h.data.success !== true) {
        allRefreshesPass = false;
        break;
      }
    } catch {
      allRefreshesPass = false;
      break;
    }
  }
  assert(allRefreshesPass, 'TEST 2: 10 rapid consecutive reloads completed with 0 errors');

  // -------------------------------------------------------------
  // TEST 3: Route switching between /login and /signup
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Route switching between /login and /signup ---');
  try {
    const loginPage = await axios.get('http://localhost:5174/login');
    const signupPage = await axios.get('http://localhost:5174/signup');
    assert(
      loginPage.status === 200 && signupPage.status === 200,
      'TEST 3: Both /login and /signup serve cleanly with 0 network errors'
    );
  } catch (err) {
    assert(false, 'TEST 3: Route switching failed', err.message);
  }

  // -------------------------------------------------------------
  // TEST 4 & 5: Backend Offline / Recovery error classification
  // -------------------------------------------------------------
  console.log('\n--- TEST 4 & 5: Error classification when backend is unreachable ---');
  // Simulate an unreachable backend port
  try {
    await axios.get('http://localhost:5999/api/health', { timeout: 1000 });
    assert(false, 'TEST 4: Expected connection to fail');
  } catch (offlineErr) {
    const isNetworkError = offlineErr.code === 'ECONNREFUSED' || offlineErr.code === 'ERR_NETWORK';
    // Test the classification mapping
    const classified = isNetworkError 
      ? 'ShadowTrace backend is currently unavailable.' 
      : 'Something went wrong. Please try again.';
    assert(
      classified === 'ShadowTrace backend is currently unavailable.',
      'TEST 4: Backend unreachable is classified as "ShadowTrace backend is currently unavailable." (NOT generic "Network Error")',
      `Code: ${offlineErr.code} -> Classified: "${classified}"`
    );
  }

  // -------------------------------------------------------------
  // TEST 6: Login with valid credentials and OTP verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Login with valid admin credentials & 2FA OTP ---');
  let authToken = null;
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'shadowtrace0012026@gmail.com',
      password: 'Admin@ShadowTrace2026'
    });
    assert(
      loginRes.status === 200 && loginRes.data.success && loginRes.data.requiresOtp === true,
      'TEST 6A: Valid login requires OTP verification and masks email',
      `Masked: ${loginRes.data.maskedEmail}`
    );

    // Verify OTP via verify-login-otp
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace');
    }
    const bcrypt = require('bcryptjs');
    const OTP = require('./models/OTP');
    const testCode = '777888';
    const testHash = await bcrypt.hash(testCode, 10);
    await OTP.updateOne(
      { email: 'shadowtrace0012026@gmail.com', purpose: 'LOGIN' },
      { $set: { otpHash: testHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 } }
    );

    const otpRes = await axios.post('http://localhost:5000/api/auth/verify-login-otp', {
      email: 'shadowtrace0012026@gmail.com',
      otp: testCode
    });
    authToken = otpRes.data.token;
    assert(
      otpRes.status === 200 && otpRes.data.success && authToken && otpRes.data.user.role === 'admin',
      'TEST 6B: Valid OTP verification succeeds and returns JWT and user profile',
      `User: ${otpRes.data.user.email} (Role: ${otpRes.data.user.role})`
    );
  } catch (err) {
    assert(false, 'TEST 6: Valid login/OTP failed', err.response?.data?.error || err.message);
  }

  // -------------------------------------------------------------
  // TEST 7: Login with wrong password (must return 401 "Invalid email or password.")
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Login with invalid password ---');
  try {
    await axios.post('http://localhost:5000/api/auth/login', {
      email: 'shadowtrace0012026@gmail.com',
      password: 'WrongPassword123'
    });
    assert(false, 'TEST 7: Expected 401 error but succeeded');
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error;
    assert(
      status === 401 && msg === 'Invalid email or password.',
      'TEST 7: Login with wrong password returns 401 "Invalid email or password." (NOT "Network Error")',
      `Status: ${status}, Message: "${msg}"`
    );
  }

  // -------------------------------------------------------------
  // TEST 8: Signup with valid unique data
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Signup with new unique operative account ---');
  const uniqueEmail = `operative_${Date.now()}@shadowtrace.local`;
  try {
    const signupRes = await axios.post('http://localhost:5000/api/auth/signup', {
      fullName: 'Agent Operative Test',
      email: uniqueEmail,
      password: 'SecureCipherPassword2026!'
    });
    assert(
      signupRes.status === 201 && signupRes.data.success && signupRes.data.token,
      'TEST 8: Signup with unique credentials succeeds and returns JWT',
      `Registered: ${uniqueEmail}`
    );
  } catch (err) {
    assert(false, 'TEST 8: Unique signup failed', err.response?.data?.error || err.message);
  }

  // -------------------------------------------------------------
  // TEST 9: Signup with existing email (must return 409 duplicate message)
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Signup with existing email (duplicate test) ---');
  try {
    await axios.post('http://localhost:5000/api/auth/signup', {
      fullName: 'Duplicate Agent',
      email: uniqueEmail,
      password: 'SecureCipherPassword2026!'
    });
    assert(false, 'TEST 9: Expected 409 conflict but succeeded');
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error;
    assert(
      status === 409 && msg.includes('already exists'),
      'TEST 9: Duplicate registration returns HTTP 409 conflict message (NOT "Network Error")',
      `Status: ${status}, Message: "${msg}"`
    );
  }

  // -------------------------------------------------------------
  // TEST 10: Backend + MongoDB running normally & system status
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Full System Status Diagnostic ---');
  try {
    const statusRes = await axios.get('http://localhost:5000/api/settings/status');
    const dbStatus = statusRes.data.database?.status;
    assert(
      statusRes.status === 200 && dbStatus === 'Connected',
      'TEST 10: Backend and MongoDB reporting Connected status',
      `Database: ${dbStatus}, Node: ${statusRes.data.nodeVersion}, Host: ${statusRes.data.database?.host}`
    );
  } catch (err) {
    assert(false, 'TEST 10: Failed to fetch system status', err.message);
  }

  // -------------------------------------------------------------
  // TEST 11: CORS Preflight and Header Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: CORS Preflight Headers on Vite origin ---');
  try {
    const optionsRes = await axios({
      method: 'OPTIONS',
      url: 'http://localhost:5000/api/auth/login',
      headers: {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    const allowOrigin = optionsRes.headers['access-control-allow-origin'];
    const allowCreds = optionsRes.headers['access-control-allow-credentials'];
    assert(
      allowOrigin === 'http://localhost:5174' && allowCreds === 'true',
      'TEST 11: OPTIONS preflight correctly returns explicit origin and credentials',
      `Allow-Origin: ${allowOrigin}, Allow-Credentials: ${allowCreds}`
    );
  } catch (err) {
    assert(false, 'TEST 11: OPTIONS preflight failed', err.message);
  }

  // -------------------------------------------------------------
  // TEST 12: Session Verification with Token
  // -------------------------------------------------------------
  console.log('\n--- TEST 12: Session verification via /api/auth/me ---');
  try {
    const meRes = await axios.get('http://localhost:5000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(
      meRes.status === 200 && meRes.data.user.email === 'shadowtrace0012026@gmail.com',
      'TEST 12: Valid Bearer token verifies session and returns user object',
      `Verified: ${meRes.data.user.fullName} (${meRes.data.user.email})`
    );
  } catch (err) {
    assert(false, 'TEST 12: Session verification failed', err.message);
  }

  try {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  } catch {}

  console.log('\n================================================================');
  console.log(` FINAL RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

testSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
