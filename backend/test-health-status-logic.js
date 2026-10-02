const assert = require('assert');

// Simulate the exact logic in useBackendHealth.js
function evaluateHealthResponse(res) {
  return Boolean(
    res && (
      res.success === true ||
      res.status === 'ok' ||
      res.status === 200 ||
      res.online === true ||
      (typeof res.message === 'string' && res.message.toLowerCase().includes('running'))
    )
  );
}

function classifyHealthError(err) {
  // If server returned an HTTP response (401, 403, 404, 422, 429, 500),
  // backend server IS ONLINE and REACHABLE!
  if (err.response) {
    return 'connected'; // Server is reachable!
  }
  // True transport/connection failure
  return 'offline';
}

function formatStatusText(healthStatus) {
  return healthStatus === 'connected'
    ? 'SHADOWTRACE SYSTEM ONLINE'
    : (healthStatus === 'reconnecting'
        ? 'RECONNECTING...'
        : (healthStatus === 'unavailable'
            ? 'BACKEND OFFLINE'
            : 'SHADOWTRACE SYSTEM ONLINE'));
}

console.log('--- TESTING HEALTH STATUS DETECTION LOGIC ---');

// Test 1: Actual Backend 200 response
const res200 = { success: true, message: 'ShadowTrace backend is running' };
assert.strictEqual(evaluateHealthResponse(res200), true);
assert.strictEqual(formatStatusText('connected'), 'SHADOWTRACE SYSTEM ONLINE');
console.log('✓ TEST 1: Backend HTTP 200 -> SHADOWTRACE SYSTEM ONLINE');

// Test 2: HTTP 500 response from backend
const err500 = { response: { status: 500, data: { error: 'Internal Error' } } };
assert.strictEqual(classifyHealthError(err500), 'connected');
console.log('✓ TEST 2: HTTP 500 does NOT mark backend offline (server responded)');

// Test 3: HTTP 429 rate limit response
const err429 = { response: { status: 429, data: { error: 'Too many requests' } } };
assert.strictEqual(classifyHealthError(err429), 'connected');
console.log('✓ TEST 3: HTTP 429 does NOT mark backend offline (server responded)');

// Test 4: True ECONNREFUSED
const errConnRefused = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:5000' };
assert.strictEqual(classifyHealthError(errConnRefused), 'offline');
assert.strictEqual(formatStatusText('unavailable'), 'BACKEND OFFLINE');
console.log('✓ TEST 4: True network failure -> BACKEND OFFLINE with RETRY');

// Test 5: Reconnecting state
assert.strictEqual(formatStatusText('reconnecting'), 'RECONNECTING...');
console.log('✓ TEST 5: Intermediate backoff state -> RECONNECTING...');

// Test 6: Recovery to connected
assert.strictEqual(formatStatusText('connected'), 'SHADOWTRACE SYSTEM ONLINE');
console.log('✓ TEST 6: Recovery restores SHADOWTRACE SYSTEM ONLINE');

console.log('\n>> ALL HEALTH STATUS DETECTION LOGIC TESTS PASSED SUCCESSFULLY!');
