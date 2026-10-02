const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('============================================');
  console.log(' STARTING SHADOWTRACE BACKEND VALIDATION');
  console.log('============================================');

  try {
    // 1. Health check
    console.log('\n[TEST 1] GET /api/health');
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log('Status:', healthRes.data.status, 'DB:', healthRes.data.services.database);

    // 2. Admin login
    console.log('\n[TEST 2] POST /api/auth/login (Admin)');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@shadowtrace.local',
      password: 'Admin@ShadowTrace2026'
    });
    console.log('Admin login success:', adminLoginRes.data.success, 'Requires OTP:', adminLoginRes.data.requiresOtp);
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace');
    }
    const bcrypt = require('bcryptjs');
    const OTP = require('./models/OTP');
    const testCode = '654987';
    const testHash = await bcrypt.hash(testCode, 10);
    await OTP.updateOne(
      { email: 'admin@shadowtrace.local', purpose: 'LOGIN' },
      { $set: { otpHash: testHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 } }
    );
    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-login-otp`, {
      email: 'admin@shadowtrace.local',
      otp: testCode
    });
    console.log('Admin User:', verifyRes.data.user.fullName, '| Role:', verifyRes.data.user.role);
    console.log('Has passwordHash in response?:', 'passwordHash' in verifyRes.data.user);
    const adminToken = verifyRes.data.token;

    // 3. Admin stats
    console.log('\n[TEST 3] GET /api/admin/stats');
    const adminStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Admin Stats:', adminStatsRes.data.data);

    // 4. Signup User A
    const userAEmail = `arun_${Date.now()}@example.com`;
    console.log(`\n[TEST 4] POST /api/auth/signup (User A: ${userAEmail})`);
    const userARes = await axios.post(`${BASE_URL}/auth/signup`, {
      fullName: 'Arun Kumar',
      email: userAEmail,
      password: 'ArunSecurePassword123'
    });
    console.log('User A registered:', userARes.data.user.fullName, '| Role:', userARes.data.user.role);
    const userAToken = userARes.data.token;

    // 5. Signup User B
    const userBEmail = `priya_${Date.now()}@example.com`;
    console.log(`\n[TEST 5] POST /api/auth/signup (User B: ${userBEmail})`);
    const userBRes = await axios.post(`${BASE_URL}/auth/signup`, {
      fullName: 'Priya Sharma',
      email: userBEmail,
      password: 'PriyaSecurePassword123'
    });
    console.log('User B registered:', userBRes.data.user.fullName, '| Role:', userBRes.data.user.role);
    const userBToken = userBRes.data.token;

    // 6. Normal User attempts Admin API -> Expect 403
    console.log('\n[TEST 6] User A attempts GET /api/admin/users (Expect 403 Forbidden)');
    try {
      await axios.get(`${BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${userAToken}` }
      });
      console.error('FAILED: User A was able to access admin API!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('PASSED: Received 403 Forbidden:', err.response.data.error);
      } else {
        throw err;
      }
    }

    // 7. Unauthenticated user attempts protected route -> Expect 401
    console.log('\n[TEST 7] Unauthenticated user attempts GET /api/history (Expect 401 Unauthorized)');
    try {
      await axios.get(`${BASE_URL}/history`);
      console.error('FAILED: Unauthenticated request succeeded!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('PASSED: Received 401 Unauthorized:', err.response.data.error);
      } else {
        throw err;
      }
    }

    // 8. User A performs single IP analysis
    console.log('\n[TEST 8] User A performs POST /api/analyze/single');
    const searchResA = await axios.post(`${BASE_URL}/analyze/single`, {
      ip: '1.1.1.1'
    }, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    console.log('User A search created:', searchResA.data.searchNumber, 'IP:', searchResA.data.data.ipAddress);
    const searchNumberA = searchResA.data.searchNumber;

    // 9. Verify Data Isolation: User A has 1 search, User B has 0 searches
    console.log('\n[TEST 9] Verify Data Isolation between User A and User B');
    const historyA = await axios.get(`${BASE_URL}/history`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const historyB = await axios.get(`${BASE_URL}/history`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    console.log('User A search count in history:', historyA.data.totalCount);
    console.log('User B search count in history:', historyB.data.totalCount);
    if (historyA.data.totalCount >= 1 && historyB.data.totalCount === 0) {
      console.log('PASSED: Strict data isolation verified! User B cannot see User A searches.');
    } else {
      console.error('FAILED: Data isolation failure!');
      process.exit(1);
    }

    // 10. User B attempts to access User A search results -> Expect 404/Forbidden
    console.log('\n[TEST 10] User B attempts GET /api/history/:id for User A search (Expect 404)');
    try {
      await axios.get(`${BASE_URL}/history/${searchNumberA}`, {
        headers: { Authorization: `Bearer ${userBToken}` }
      });
      console.error('FAILED: User B was able to view User A search session!');
      process.exit(1);
    } catch (err) {
      if (err.response && (err.response.status === 404 || err.response.status === 403)) {
        console.log('PASSED: User B access denied:', err.response.data.error);
      } else {
        throw err;
      }
    }

    // 11. User B attempts to export User A search -> Expect 404/Forbidden
    console.log('\n[TEST 11] User B attempts GET /api/export/:id for User A search (Expect 404)');
    try {
      await axios.get(`${BASE_URL}/export/${searchNumberA}?format=json`, {
        headers: { Authorization: `Bearer ${userBToken}` }
      });
      console.error('FAILED: User B was able to export User A search!');
      process.exit(1);
    } catch (err) {
      if (err.response && (err.response.status === 404 || err.response.status === 403)) {
        console.log('PASSED: User B export denied:', err.response.data.error);
      } else {
        throw err;
      }
    }

    // 12. Admin lists all users
    console.log('\n[TEST 12] Admin GET /api/admin/users');
    const adminUsersRes = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Total registered users seen by Admin:', adminUsersRes.data.total);
    console.log('Users list:');
    adminUsersRes.data.users.forEach(u => {
      console.log(` - [${u.role}] ${u.fullName} (${u.email}) - Searches: ${u.searchesCount} - Active: ${u.isActive}`);
      if ('passwordHash' in u || 'password' in u) {
        console.error('FAILED: passwordHash exposed in admin users list!');
        process.exit(1);
      }
    });

    try {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    } catch {}

    console.log('\n============================================');
    console.log(' ALL 12 BACKEND VALIDATION TESTS PASSED 100%!');
    console.log('============================================');
  } catch (error) {
    console.error('Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
