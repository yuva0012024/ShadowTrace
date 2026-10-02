const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING NETWORK & AUTH VERIFICATION TESTS ---');

  // 1. Health check via localhost
  console.log('\n[TEST 1] GET http://localhost:5000/api/health');
  const res1 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  console.log('Status:', res1.statusCode);
  console.log('Body:', res1.data);
  if (res1.statusCode === 200 && res1.data.success === true && res1.data.message === 'ShadowTrace backend is running') {
    console.log('>> TEST 1 PASSED: /api/health returned required format immediately.');
  } else {
    console.error('>> TEST 1 FAILED');
  }

  // 2. Health check via 127.0.0.1
  console.log('\n[TEST 2] GET http://127.0.0.1:5000/api/health (IPv4 consistency)');
  const res2 = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  console.log('Status:', res2.statusCode);
  if (res2.statusCode === 200 && res2.data.success === true) {
    console.log('>> TEST 2 PASSED: 127.0.0.1 and localhost respond identically.');
  } else {
    console.error('>> TEST 2 FAILED');
  }

  // 3. CORS preflight (OPTIONS)
  console.log('\n[TEST 3] OPTIONS /api/auth/login with Origin: http://localhost:5174');
  const res3 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:5174',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization'
    }
  });
  console.log('Status:', res3.statusCode);
  console.log('Access-Control-Allow-Origin:', res3.headers['access-control-allow-origin']);
  console.log('Access-Control-Allow-Credentials:', res3.headers['access-control-allow-credentials']);
  if (res3.headers['access-control-allow-origin'] === 'http://localhost:5174' && res3.headers['access-control-allow-credentials'] === 'true') {
    console.log('>> TEST 3 PASSED: CORS preflight properly configured for Vite origin.');
  } else {
    console.error('>> TEST 3 FAILED: CORS headers missing or incorrect.');
  }

  // 4. Login with valid Admin credentials
  console.log('\n[TEST 4] POST /api/auth/login with valid credentials');
  const res4 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5174'
    }
  }, {
    email: 'shadowtrace0012026@gmail.com',
    password: 'Admin@ShadowTrace2026'
  });
  console.log('Status:', res4.statusCode);
  console.log('Success:', res4.data.success);
  console.log('Token received:', !!res4.data.token);
  console.log('User Role:', res4.data.user?.role);
  let adminToken = res4.data.token;
  if (res4.statusCode === 200 && res4.data.success && adminToken) {
    console.log('>> TEST 4 PASSED: Admin login successful, JWT generated.');
  } else {
    console.error('>> TEST 4 FAILED');
  }

  // 5. Login with invalid credentials
  console.log('\n[TEST 5] POST /api/auth/login with invalid password');
  const res5 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5174'
    }
  }, {
    email: 'shadowtrace0012026@gmail.com',
    password: 'WrongPassword123!'
  });
  console.log('Status:', res5.statusCode);
  console.log('Error message:', res5.data.error);
  if (res5.statusCode === 401 && res5.data.error === 'Invalid email or password.') {
    console.log('>> TEST 5 PASSED: Proper 401 response for bad credentials.');
  } else {
    console.error('>> TEST 5 FAILED');
  }

  // 6. Verify session via GET /api/auth/me
  console.log('\n[TEST 6] GET /api/auth/me with Bearer token');
  const res6 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Accept': 'application/json'
    }
  });
  console.log('Status:', res6.statusCode);
  console.log('User:', res6.data.user?.email);
  if (res6.statusCode === 200 && res6.data.user?.email === 'shadowtrace0012026@gmail.com') {
    console.log('>> TEST 6 PASSED: Session verified via /api/auth/me.');
  } else {
    console.error('>> TEST 6 FAILED');
  }

  // 7. Signup new user
  const testEmail = `test_agent_${Date.now()}@shadowtrace.local`;
  console.log(`\n[TEST 7] POST /api/auth/signup with new user (${testEmail})`);
  const res7 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5174'
    }
  }, {
    fullName: 'Test Agent Carter',
    email: testEmail,
    password: 'ValidPassword2026'
  });
  console.log('Status:', res7.statusCode);
  console.log('Success:', res7.data.success);
  if (res7.statusCode === 201 && res7.data.success) {
    console.log('>> TEST 7 PASSED: User registration successful.');
  } else {
    console.error('>> TEST 7 FAILED');
  }

  // 8. Duplicate signup should return 409
  console.log(`\n[TEST 8] POST /api/auth/signup duplicate email`);
  const res8 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5174'
    }
  }, {
    fullName: 'Test Agent Duplicate',
    email: testEmail,
    password: 'ValidPassword2026'
  });
  console.log('Status:', res8.statusCode);
  console.log('Error message:', res8.data.error);
  if (res8.statusCode === 409) {
    console.log('>> TEST 8 PASSED: Duplicate registration correctly rejected with 409.');
  } else {
    console.error('>> TEST 8 FAILED');
  }

  console.log('\n--- ALL NETWORK & AUTH VERIFICATION TESTS COMPLETE ---');
}

runTests().catch(console.error);
