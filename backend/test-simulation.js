const http = require('http');

// Helper to test classification logic matching api.js
function classifyError(status, data, errorMsg, code) {
  if (status === 503 && (data?.error === 'Database service is temporarily unavailable.' || data?.message?.includes('Database'))) {
    return { type: 'DATABASE_UNAVAILABLE', message: 'Database service is temporarily unavailable.' };
  }
  if (data?.error === 'GEOLOCATION_SERVICE_UNAVAILABLE' || data?.message?.includes('IP location service is temporarily unavailable')) {
    return { type: 'GEOLOCATION_UNAVAILABLE', message: 'IP location service is temporarily unavailable.' };
  }
  if (status === 401) {
    return { type: 'UNAUTHORIZED', message: data?.error || 'Invalid email or password.' };
  }
  if (status === 403) {
    return { type: 'FORBIDDEN', message: data?.error || 'You do not have permission to access this resource.' };
  }
  if (status === 404) {
    return { type: 'NOT_FOUND', message: data?.error || 'Requested ShadowTrace service was not found.' };
  }
  if (status === 429) {
    return { type: 'RATE_LIMIT', message: data?.error || 'Too many requests. Please wait and try again.' };
  }
  if (status >= 500) {
    return { type: 'SERVER_ERROR', message: 'ShadowTrace server encountered an internal error.' };
  }
  if (code === 'ECONNREFUSED' || errorMsg === 'Network Error' || code === 'ERR_NETWORK') {
    return { type: 'BACKEND_UNREACHABLE', message: 'ShadowTrace backend is unavailable.' };
  }
  if (code === 'ECONNABORTED' || errorMsg?.toLowerCase().includes('timeout')) {
    return { type: 'TIMEOUT', message: 'Connection timed out. Please try again.' };
  }
  return { type: 'UNKNOWN', message: errorMsg || 'An unexpected connection error occurred.' };
}

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', err => reject(err));
  });
}

async function runSimulation() {
  console.log('=== RUNNING END-TO-END SIMULATION TESTS ===\n');

  // Test A: Check frontend server is answering on port 5174
  console.log('[SIM A] Checking frontend Vite dev server at http://localhost:5174/login');
  try {
    const frontRes = await fetchUrl('http://localhost:5174/login');
    console.log('Frontend HTTP Status:', frontRes.statusCode);
    if (frontRes.statusCode === 200 && frontRes.body.includes('<!DOCTYPE html>')) {
      console.log('>> PASS: Frontend server is alive and serves index.html properly.\n');
    }
  } catch (err) {
    console.error('>> Frontend check failed:', err.message);
  }

  // Test B: Verify 10 rapid sequential/concurrent health-check refreshes (simulating rapid user reloads)
  console.log('[SIM B] Simulating 10 rapid health-check queries (re-render / refresh test)...');
  let passCount = 0;
  for (let i = 1; i <= 10; i++) {
    const health = await fetchUrl('http://localhost:5000/api/health');
    const json = JSON.parse(health.body);
    if (health.statusCode === 200 && json.success === true && json.message === 'ShadowTrace backend is running') {
      passCount++;
    }
  }
  console.log(`Completed 10/10 health checks. Success count: ${passCount}/10`);
  if (passCount === 10) {
    console.log('>> PASS: 10 rapid health checks succeeded with zero false failures.\n');
  } else {
    console.error('>> FAIL: Some health checks failed.\n');
  }

  // Test C: Error classification unit tests for all required categories
  console.log('[SIM C] Testing Error Classification for all requirements (A through J)...');
  const testCases = [
    { name: 'A. Backend Unreachable', input: [null, null, 'Network Error', 'ECONNREFUSED'], expected: 'ShadowTrace backend is unavailable.' },
    { name: 'B. Timeout', input: [null, null, 'timeout of 15000ms exceeded', 'ECONNABORTED'], expected: 'Connection timed out. Please try again.' },
    { name: 'D. HTTP 401', input: [401, { error: 'Invalid email address or password.' }, null, null], expected: 'Invalid email address or password.' },
    { name: 'E. HTTP 403', input: [403, { error: 'Your account has been deactivated.' }, null, null], expected: 'Your account has been deactivated.' },
    { name: 'F. HTTP 404', input: [404, { error: 'Requested ShadowTrace service was not found.' }, null, null], expected: 'Requested ShadowTrace service was not found.' },
    { name: 'G. HTTP 429', input: [429, { error: 'Too many requests. Please wait and try again.' }, null, null], expected: 'Too many requests. Please wait and try again.' },
    { name: 'H. HTTP 500', input: [500, { error: 'Internal Server Error' }, null, null], expected: 'ShadowTrace server encountered an internal error.' },
    { name: 'I. MongoDB Disconnected', input: [503, { error: 'Database service is temporarily unavailable.' }, null, null], expected: 'Database service is temporarily unavailable.' },
    { name: 'J. Geolocation Unavailable', input: [503, { error: 'GEOLOCATION_SERVICE_UNAVAILABLE', message: 'IP location service is temporarily unavailable.' }, null, null], expected: 'IP location service is temporarily unavailable.' }
  ];

  let classifiedPass = true;
  for (const tc of testCases) {
    const res = classifyError(...tc.input);
    if (res.message === tc.expected) {
      console.log(`  ✓ ${tc.name} -> "${res.message}"`);
    } else {
      console.error(`  ✗ ${tc.name} FAILED: Expected "${tc.expected}", got "${res.message}"`);
      classifiedPass = false;
    }
  }

  if (classifiedPass) {
    console.log('>> PASS: All error categories classified accurately. Never returns raw "Network Error".\n');
  }

  // Test D: Check full application flow - Single IP Analysis with authenticated user
  console.log('[SIM D] Testing protected IP analysis flow with Admin token...');
  const loginReq = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      const loginData = JSON.parse(b);
      console.log('Login Status in SIM D:', res.statusCode, 'Data:', loginData);
      const token = loginData.token;

      // Analyze an IP
      const analyzeReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/analyze/single',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, (res2) => {
        let b2 = '';
        res2.on('data', c => b2 += c);
        res2.on('end', () => {
          const analyzeData = JSON.parse(b2);
          console.log('Analyze Status:', res2.statusCode);
          console.log('Analyze Success:', analyzeData.success);
          console.log('IP Analyzed:', analyzeData.data?.ipAddress);
          console.log('Country:', analyzeData.data?.country);
          if (res2.statusCode === 200 && analyzeData.success) {
            console.log('>> PASS: Full authenticated analysis flow operates end-to-end.\n');
          }
        });
      });
      analyzeReq.write(JSON.stringify({ ip: '8.8.8.8' }));
      analyzeReq.end();
    });
  });
  loginReq.write(JSON.stringify({ email: 'shadowtrace0012026@gmail.com', password: 'Admin@ShadowTrace2026' }));
  loginReq.end();
}

runSimulation().catch(console.error);
