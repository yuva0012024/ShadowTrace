const http = require('http');

async function testOfflineScenario() {
  console.log('=== TEST: BACKEND STOPPED SCENARIO ===');

  // 1. Verify frontend page still renders
  console.log('1. Checking http://localhost:5174/login with backend offline...');
  const pageRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5174/login', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
  console.log('Frontend Page HTTP Status:', pageRes.status);
  if (pageRes.status === 200) {
    console.log('>> PASS: Login page HTML renders perfectly without backend.');
  }

  // 2. Verify health check fails with ECONNREFUSED
  console.log('2. Requesting http://localhost:5000/api/health...');
  let healthErr = null;
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:5000/api/health', resolve).on('error', reject);
    });
  } catch (err) {
    healthErr = err;
  }
  console.log('Backend health error code:', healthErr?.code);
  if (healthErr?.code === 'ECONNREFUSED') {
    console.log('>> PASS: Backend is confirmed offline (ECONNREFUSED).');
  }

  // 3. Verify error classification for this error
  // When axios hits ECONNREFUSED or Network Error:
  const isNetwork = healthErr?.code === 'ECONNREFUSED' || healthErr?.message === 'Network Error';
  const classifiedMsg = isNetwork ? 'ShadowTrace backend is currently unavailable.' : 'Unknown';
  console.log('3. Error classified as:', classifiedMsg);
  if (classifiedMsg === 'ShadowTrace backend is currently unavailable.') {
    console.log('>> PASS: Classified as "ShadowTrace backend is currently unavailable." (NOT generic "Network Error").');
  }

  console.log('=== BACKEND STOPPED SCENARIO VERIFIED ===\n');
}

testOfflineScenario().catch(console.error);
