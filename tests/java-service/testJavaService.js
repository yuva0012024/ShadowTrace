const assert = require('assert');

console.log('>>> RUNNING SHADOWTRACE JAVA SERVICE INTEGRATION TESTS <<<');

async function testJavaService() {
  const javaUrl = 'http://localhost:8080/api/java';

  // 1. Health endpoint
  const healthRes = await fetch(`${javaUrl}/health`).then(r => r.json());
  assert.strictEqual(healthRes.status, 'UP');
  assert.strictEqual(healthRes.service, 'ShadowTrace Analytical Engine');
  console.log(`  ✔ GET /api/java/health responded status: UP, JVM: ${healthRes.jvmVersion}`);

  // 2. Haversine distance endpoint: New York (40.7128, -74.0060) to London (51.5074, -0.1278) ~ 5570 km
  const distRes = await fetch(`${javaUrl}/analytics/distance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat1: 40.7128, lon1: -74.0060, lat2: 51.5074, lon2: -0.1278 })
  }).then(r => r.json());
  assert.strictEqual(distRes.success, true);
  assert.ok(Math.abs(distRes.distanceKm - 5570) < 50);
  console.log(`  ✔ POST /api/java/analytics/distance calculated NY to London: ${distRes.distanceKm} km`);

  // 3. Infrastructure profiling endpoint
  const profileRes = await fetch(`${javaUrl}/analytics/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ipAddress: '1.1.1.1', isp: 'Cloudflare, Inc', organization: 'APNIC' })
  }).then(r => r.json());
  assert.strictEqual(profileRes.success, true);
  assert.ok(profileRes.infrastructureProfile.includes('Anycast'));
  console.log(`  ✔ POST /api/java/analytics/profile classified 1.1.1.1: ${profileRes.infrastructureProfile}`);

  console.log('\n>>> ALL JAVA SERVICE INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n');
}

testJavaService().catch(err => {
  console.error('Java integration test failed:', err);
  process.exit(1);
});
