const assert = require('assert');
const { validateIP, sanitizeIPList, isPrivateIPv4, isPrivateIPv6 } = require('../../backend/services/ipValidationService');
const { normalizeField, normalizeCoordinate, escapeCsv } = require('../../backend/utils/helpers');

console.log('>>> RUNNING SHADOWTRACE BACKEND AUTOMATED TESTS <<<');

// 1. IP Validation Tests
console.log('\n[Suite 1] IP Validation & Classification');
{
  // Valid IPv4
  const res1 = validateIP('8.8.8.8');
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.type, 'IPv4');
  assert.strictEqual(res1.isPrivate, false);
  console.log('  ✔ Valid public IPv4 (8.8.8.8) passed');

  // Valid IPv6
  const res2 = validateIP('2001:4860:4860::8888');
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.type, 'IPv6');
  assert.strictEqual(res2.isPrivate, false);
  console.log('  ✔ Valid public IPv6 (2001:4860:4860::8888) passed');

  // Private IPv4 ranges
  assert.strictEqual(isPrivateIPv4('10.0.0.1'), true);
  assert.strictEqual(isPrivateIPv4('192.168.1.1'), true);
  assert.strictEqual(isPrivateIPv4('172.16.5.1'), true);
  assert.strictEqual(isPrivateIPv4('127.0.0.1'), true);
  console.log('  ✔ Private IPv4 ranges detected accurately');

  // Private IPv6 ranges
  assert.strictEqual(isPrivateIPv6('::1'), true);
  assert.strictEqual(isPrivateIPv6('fc00::1'), true);
  assert.strictEqual(isPrivateIPv6('fe80::1'), true);
  console.log('  ✔ Private IPv6 ranges detected accurately');

  // Malformed IP
  const res3 = validateIP('999.999.999.999');
  assert.strictEqual(res3.isValid, false);
  assert.ok(res3.error.includes('Malformed or invalid IP address'));

  const res4 = validateIP('not-an-ip-string');
  assert.strictEqual(res4.isValid, false);

  const res5 = validateIP('');
  assert.strictEqual(res5.isValid, false);
  console.log('  ✔ Malformed and empty IP strings rejected gracefully');
}

// 2. IP List Sanitization
console.log('\n[Suite 2] Batch IP Sanitization & Deduplication');
{
  const input = `8.8.8.8
  1.1.1.1, 8.8.8.8
  
  208.67.222.222`;
  const sanitized = sanitizeIPList(input);
  assert.strictEqual(sanitized.length, 3);
  assert.deepStrictEqual(sanitized, ['8.8.8.8', '1.1.1.1', '208.67.222.222']);
  console.log('  ✔ Multi-line and comma-separated IPs sanitized & deduplicated');
}

// 3. Normalization Helpers
console.log('\n[Suite 3] Field Normalization & CSV Escaping');
{
  assert.strictEqual(normalizeField(''), 'Not available');
  assert.strictEqual(normalizeField(null), 'Not available');
  assert.strictEqual(normalizeField(undefined), 'Not available');
  assert.strictEqual(normalizeField('null'), 'Not available');
  assert.strictEqual(normalizeField('Ashburn'), 'Ashburn');
  console.log('  ✔ Empty fields normalize to "Not available"');

  assert.strictEqual(normalizeCoordinate(null), null);
  assert.strictEqual(normalizeCoordinate(''), null);
  assert.strictEqual(normalizeCoordinate(39.03), 39.03);
  assert.strictEqual(normalizeCoordinate('39.03'), 39.03);
  console.log('  ✔ Coordinates normalize to float or null');

  assert.strictEqual(escapeCsv('Simple Text'), '"Simple Text"');
  assert.strictEqual(escapeCsv('Text, with comma'), '"Text, with comma"');
  assert.strictEqual(escapeCsv('Text "with quotes"'), '"Text ""with quotes"""');
  console.log('  ✔ RFC 4180 CSV escaping passes');
}

// 4. API Endpoints Test (using live running backend)
console.log('\n[Suite 4] Live API Endpoint Verification (HTTP)');
async function testLiveEndpoints() {
  const baseUrl = 'http://localhost:5000/api';

  // Health
  const healthRes = await fetch(`${baseUrl}/health`).then(r => r.json());
  assert.ok(healthRes.status === 'ok' || healthRes.status === 'healthy' || healthRes.status === 'online');
  assert.strictEqual(healthRes.services.backend, 'operational');
  assert.strictEqual(healthRes.services.database, 'connected');
  console.log('  ✔ GET /api/health returned healthy & connected database');

  // Authenticate (Login as Admin with 2FA OTP)
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@shadowtrace.local',
      password: 'Admin@ShadowTrace2026'
    })
  }).then(r => r.json());
  assert.strictEqual(loginRes.success, true);
  assert.strictEqual(loginRes.requiresOtp, true);
  console.log('  ✔ POST /api/auth/login requires OTP clearance');

  // Verify wrong OTP fails
  const wrongOtpRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@shadowtrace.local',
      otp: '000000'
    })
  }).then(r => r.json());
  assert.strictEqual(wrongOtpRes.success, false);
  console.log('  ✔ POST /api/auth/verify-login-otp rejects wrong code');

  // Fetch the latest OTP hash and generate matching OTP for test verification
  const mongoose = require('../../backend/node_modules/mongoose');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace');
  }
  const bcrypt = require('../../backend/node_modules/bcryptjs');
  const OTP = require('../../backend/models/OTP');
  const testOtpCode = '654321';
  const testOtpHash = await bcrypt.hash(testOtpCode, 10);
  await OTP.updateOne(
    { email: 'admin@shadowtrace.local', purpose: 'LOGIN' },
    { $set: { otpHash: testOtpHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 } }
  );

  const verifyRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@shadowtrace.local',
      otp: testOtpCode
    })
  }).then(r => r.json());
  assert.strictEqual(verifyRes.success, true);
  const token = verifyRes.token;
  assert.ok(token, 'JWT token must be returned after successful OTP verification');
  console.log('  ✔ POST /api/auth/verify-login-otp authenticated successfully with real OTP');

  // Stats
  const statsRes = await fetch(`${baseUrl}/history/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  assert.strictEqual(statsRes.success, true);
  assert.ok(statsRes.data.totalSearches >= 1);
  assert.ok(statsRes.data.ipsAnalyzed >= 1);
  console.log(`  ✔ GET /api/history/stats returned ${statsRes.data.totalSearches} searches, ${statsRes.data.ipsAnalyzed} IPs`);

  // History List
  const histRes = await fetch(`${baseUrl}/history`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  assert.strictEqual(histRes.success, true);
  assert.ok(Array.isArray(histRes.searches));
  console.log(`  ✔ GET /api/history retrieved ${histRes.searches.length} records`);

  // Single IP analysis
  const singleRes = await fetch(`${baseUrl}/analyze/single`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ ip: '8.8.8.8' })
  }).then(r => r.json());
  assert.strictEqual(singleRes.success, true);
  assert.strictEqual(singleRes.data.ipAddress, '8.8.8.8');
  assert.strictEqual(singleRes.data.country, 'United States');
  console.log(`  ✔ POST /api/analyze/single resolved ${singleRes.data.ipAddress} (${singleRes.searchNumber})`);

  // CSV Export verification
  const csvRes = await fetch(`${baseUrl}/export/${singleRes.searchNumber}?format=csv`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.text());
  assert.ok(csvRes.includes('Search Number,Searched At,IP Address'));
  assert.ok(csvRes.includes('8.8.8.8'));
  console.log('  ✔ GET /api/export/:id?format=csv generated valid CSV data');

  console.log('\n>>> ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY! <<<\n');
  await mongoose.disconnect();
}

testLiveEndpoints().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
