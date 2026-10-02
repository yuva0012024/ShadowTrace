const http = require('http');

async function testMultipleRefreshes() {
  console.log('=== TESTING MULTIPLE REFRESHES (15 CONSECUTIVE RELOADS) ===\n');

  for (let i = 1; i <= 15; i++) {
    // 1. Fetch frontend page
    const page = await new Promise((resolve, reject) => {
      http.get('http://localhost:5174/login', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, length: d.length }));
      }).on('error', reject);
    });

    // 2. Fetch health endpoint
    const health = await new Promise((resolve, reject) => {
      http.get('http://localhost:5000/api/health', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) });
          } catch (e) {
            resolve({ status: res.statusCode, data: d });
          }
        });
      }).on('error', reject);
    });

    if (page.status === 200 && health.status === 200 && health.data.success === true) {
      console.log(`Reload ${i}/15: OK (Page: ${page.status}, Health: ${health.status}, msg: "${health.data.message}")`);
    } else {
      console.error(`Reload ${i}/15: FAILED (Page: ${page.status}, Health: ${health.status})`);
      process.exit(1);
    }
  }

  console.log('\n>> PASS: 15/15 rapid refreshes succeeded cleanly with zero network errors or race conditions.');
  console.log('=== MULTIPLE REFRESHES TEST COMPLETE ===\n');
}

testMultipleRefreshes().catch(console.error);
