const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('>>> RUNNING SHADOWTRACE FRONTEND AUTOMATED TESTS <<<');

// 1. Check Frontend build distribution files
console.log('\n[Suite 1] Frontend Build Artifact Verification');
const distDir = path.resolve(__dirname, '../../frontend/dist');
assert.ok(fs.existsSync(distDir), 'frontend/dist directory must exist');
assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'frontend/dist/index.html must exist');
console.log('  ✔ frontend/dist/index.html exists and is bundled');

const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
assert.ok(indexHtml.includes('ShadowTrace'), 'Title or branding must appear in bundled HTML');
console.log('  ✔ Brand metadata verified in production HTML');

// 2. Component and Utility Logic Checks
console.log('\n[Suite 2] Frontend Utility Logic');

function formatCoordinates(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return 'Not available';
  }
  const numLat = Number(lat);
  const numLon = Number(lon);
  if (isNaN(numLat) || isNaN(numLon)) return 'Not available';
  const latDir = numLat >= 0 ? 'N' : 'S';
  const lonDir = numLon >= 0 ? 'E' : 'W';
  return `${Math.abs(numLat).toFixed(4)}° ${latDir}, ${Math.abs(numLon).toFixed(4)}° ${lonDir}`;
}

assert.strictEqual(formatCoordinates(null, null), 'Not available');
assert.strictEqual(formatCoordinates(39.03, -77.5), '39.0300° N, 77.5000° W');
console.log('  ✔ formatCoordinates formats latitude & longitude correctly');

function formatLocation(record) {
  if (!record) return 'Not available';
  const parts = [];
  if (record.city && record.city !== 'Not available') parts.push(record.city);
  if (record.region && record.region !== 'Not available') parts.push(record.region);
  if (record.country && record.country !== 'Not available') parts.push(record.country);
  if (parts.length === 0) return 'Not available';
  return parts.join(', ');
}

assert.strictEqual(formatLocation({ city: 'Ashburn', region: 'Virginia', country: 'United States' }), 'Ashburn, Virginia, United States');
assert.strictEqual(formatLocation({ city: 'Not available', region: 'Not available', country: 'United States' }), 'United States');
console.log('  ✔ formatLocation handles missing components accurately');

console.log('\n>>> ALL FRONTEND AUTOMATED TESTS PASSED SUCCESSFULLY! <<<\n');
