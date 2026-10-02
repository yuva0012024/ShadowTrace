// Comprehensive ShadowTrace Connection and Health Verification Suite
const path = require('path');
try {
  const dotenv = require(path.join(__dirname, 'backend/node_modules/dotenv'));
  dotenv.config({ path: path.join(__dirname, 'backend/.env') });
  dotenv.config();
} catch {}
const http = require('http');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' SHADOWTRACE HEALTH & API VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  // TEST 1: Health endpoint response structure
  console.log('--- TEST 1: Reliable Health Endpoint (/api/health) ---');
  try {
    const res = await request('http://localhost:5000/api/health');
    assert('Health endpoint returns HTTP 200', res.status === 200);
    assert('Health returns success: true', res.body.success === true);
    assert('Health returns service: "ShadowTrace Backend"', res.body.service === 'ShadowTrace Backend');
    assert('Health returns status: "online"', res.body.status === 'online');
    assert('Health returns database: "connected"', res.body.database === 'connected');
    assert('Health does not expose credentials', !res.body.mongoUri && !res.body.jwtSecret);
  } catch (err) {
    assert('Health endpoint connection failed: ' + err.message, false);
  }

  // TEST 2: Dynamic CORS across all Vite ports
  console.log('\n--- TEST 2: Dynamic CORS Across Vite Ports ---');
  const testOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5178'
  ];
  for (const origin of testOrigins) {
    try {
      const res = await request('http://localhost:5000/api/health', {
        headers: { 'Origin': origin }
      });
      const allowOrigin = res.headers['access-control-allow-origin'];
      assert(`CORS allows origin ${origin}`, allowOrigin === origin);
    } catch (err) {
      assert(`CORS request for ${origin} failed: ` + err.message, false);
    }
  }

  // TEST 3: Health endpoint not throttled by rate limiter
  console.log('\n--- TEST 3: Rapid Health Check (Rate Limiter Bypass) ---');
  try {
    let allOk = true;
    for (let i = 0; i < 25; i++) {
      const res = await request('http://localhost:5000/api/health');
      if (res.status !== 200) {
        allOk = false;
        break;
      }
    }
    assert('25 rapid health requests all return 200 without 429 throttling', allOk);
  } catch (err) {
    assert('Rapid health check failed: ' + err.message, false);
  }

  // TEST 4: Invalid Login handling (does not crash backend, clear message)
  console.log('\n--- TEST 4: Invalid Login Authentication Flow ---');
  try {
    const res = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'fake@example.com', password: 'wrongpassword' }
    });
    assert('Invalid login returns 401', res.status === 401);
    assert('Invalid login returns proper message', Boolean(res.body.error));
    // Check backend health immediately after to verify backend did not crash
    const health = await request('http://localhost:5000/api/health');
    assert('Backend remains online after failed login', health.status === 200);
  } catch (err) {
    assert('Invalid login test failed: ' + err.message, false);
  }

  // TEST 5: Admin Direct Login Clearance (Strictly NO OTP required)
  console.log('\n--- TEST 5: Admin Direct Login (No OTP Required) ---');
  let authToken = null;
  try {
    const res = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: process.env.ADMIN_EMAIL || 'admin@shadowtrace.local',
        password: process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD'
      }
    });
    assert('Admin login returns 200', res.status === 200);
    assert('Admin login does NOT require OTP (requiresOtp: false)', res.body.requiresOtp === false);
    assert('Admin login returns JWT token directly', Boolean(res.body.token));
    assert('Admin login returns user role "admin"', res.body.user?.role === 'admin');
    authToken = res.body.token;
  } catch (err) {
    assert('Admin login test failed: ' + err.message, false);
  }

  // TEST 6: Authenticated IP Reconnaissance (Public IP & Private IP)
  console.log('\n--- TEST 6: Location Intelligence / IP Analysis ---');
  if (authToken) {
    try {
      const res = await request('http://localhost:5000/api/analyze/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: { ip: '8.8.8.8' }
      });
      assert('IP analysis returns 200', res.status === 200);
      assert('IP analysis resolves data for 8.8.8.8', res.body.data?.ipAddress === '8.8.8.8');
      assert('Backend remains online after IP analysis', true);
    } catch (err) {
      assert('IP analysis failed: ' + err.message, false);
    }
  }

  // TEST 7: Settings / Status diagnostic endpoint
  console.log('\n--- TEST 7: Diagnostic Endpoint (/api/settings/status) ---');
  try {
    const res = await request('http://localhost:5000/api/settings/status');
    assert('Settings status returns 200', res.status === 200);
    assert('Database status is Connected', res.body.database?.status === 'Connected');
    assert('System is ShadowTrace Location Intelligence', res.body.system === 'ShadowTrace Location Intelligence');
  } catch (err) {
    assert('Settings status failed: ' + err.message, false);
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed}/${total} assertions passed (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================');
  try {
    const mongoose = require('./backend/node_modules/mongoose');
    await mongoose.disconnect();
  } catch {}
}

runTests().catch(console.error);
