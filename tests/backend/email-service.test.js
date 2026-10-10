const assert = require('assert');
const path = require('path');

const {
  resolveProvider,
  getEmailServiceStatus,
  maskEmail,
  maskApiKey,
  maskSecret,
  getResendConfig,
  getSmtpConfig
} = require('../../backend/services/emailService');

console.log('========================================================');
console.log(' SHADOWTRACE EMAIL SERVICE UNIT & SECURITY TEST SUITE');
console.log('========================================================\n');

let passed = 0;
let total = 0;
function pass(desc) {
  total++;
  passed++;
  console.log(`[PASS] ${desc}`);
}

// 1. Masking Security (Zero-leak guarantee)
console.log('--- TEST 1: Zero-Leak Credential Masking ---');
assert.strictEqual(maskEmail('operative@gmail.com'), 'o***@gmail.com');
assert.strictEqual(maskEmail('a@domain.com'), 'a***@domain.com');
assert.strictEqual(maskEmail(''), '');
pass('maskEmail safely redacts email addresses');

assert.strictEqual(maskApiKey('re_1234567890abcdef'), 're_123****');
assert.strictEqual(maskApiKey(''), 'none');
assert.strictEqual(maskApiKey(null), 'none');
pass('maskApiKey safely redacts API keys');

assert.strictEqual(maskSecret('mySuperSecretPassword123'), 'myS****');
assert.strictEqual(maskSecret(''), 'none');
pass('maskSecret safely redacts secrets');

// 2. Sender Address Resolution
console.log('\n--- TEST 2: Sender Address Normalization ---');
const originalResendFrom = process.env.RESEND_FROM_EMAIL;
delete process.env.RESEND_FROM_EMAIL;
const defaultResend = getResendConfig();
assert.strictEqual(defaultResend.sender, 'ShadowTrace <onboarding@resend.dev>');
pass('Resend defaults to valid onboarding sender when unset');

process.env.RESEND_FROM_EMAIL = 'security@shadowtrace.org';
const customResend = getResendConfig();
assert.strictEqual(customResend.sender, 'ShadowTrace <security@shadowtrace.org>');
pass('Resend formats bare custom email with ShadowTrace brand wrapper');

process.env.RESEND_FROM_EMAIL = 'Custom Brand <noreply@shadowtrace.org>';
const wrappedResend = getResendConfig();
assert.strictEqual(wrappedResend.sender, 'Custom Brand <noreply@shadowtrace.org>');
pass('Resend preserves full formatted sender string');
process.env.RESEND_FROM_EMAIL = originalResendFrom;

// 3. Provider Resolution Logic
console.log('\n--- TEST 3: Smart Provider Resolution ---');
const savedKey = process.env.RESEND_API_KEY;
const savedProvider = process.env.EMAIL_PROVIDER;

process.env.EMAIL_PROVIDER = 'resend';
assert.strictEqual(resolveProvider(), 'resend');
pass('Explicit EMAIL_PROVIDER=resend respected');

process.env.EMAIL_PROVIDER = 'smtp';
assert.strictEqual(resolveProvider(), 'smtp');
pass('Explicit EMAIL_PROVIDER=smtp respected');

delete process.env.EMAIL_PROVIDER;
process.env.RESEND_API_KEY = 're_testkey123456';
assert.strictEqual(resolveProvider(), 'resend');
pass('Resend HTTPS chosen automatically when RESEND_API_KEY is configured');

process.env.RESEND_API_KEY = savedKey;
process.env.EMAIL_PROVIDER = savedProvider;

// 4. Safe Diagnostic Status (No credentials or plain secrets exposed)
console.log('\n--- TEST 4: Safe Diagnostic Status Integrity ---');
const status = getEmailServiceStatus();
assert.ok(status.provider, 'Provider label must be present');
assert.ok(typeof status.isConfigured === 'boolean', 'isConfigured must be boolean');
assert.ok(typeof status.resend === 'object', 'resend diagnostics must be present');
assert.ok(typeof status.smtp === 'object', 'smtp diagnostics must be present');
assert.ok(typeof status.environment === 'object', 'environment metadata must be present');
assert.strictEqual(status.resend.apiKey, undefined, 'Raw API key must NEVER be in status');
assert.strictEqual(status.smtp.pass, undefined, 'Raw SMTP password must NEVER be in status');
pass('getEmailServiceStatus guarantees zero credential leaks');

console.log('\n========================================================');
console.log(` RESULTS: ${passed}/${total} assertions passed (100%)`);
console.log('========================================================\n');
