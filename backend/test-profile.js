const axios = require('axios');

async function testProfileApi() {
  console.log('Testing Profile APIs...');
  const BASE_URL = 'http://127.0.0.1:5000/api';

  // Login as admin
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@shadowtrace.local',
    password: 'Admin@ShadowTrace2026'
  });
  const token = loginRes.data.token;
  console.log('Logged in as admin. Token acquired.');

  // 1. GET /api/profile
  const profRes = await axios.get(`${BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Profile retrieved:', profRes.data.user.fullName, 'Role:', profRes.data.user.role, 'Avatar:', profRes.data.user.avatarType);
  console.log('Stats:', profRes.data.stats);

  // 2. PUT /api/profile (change avatar to female)
  const updateRes1 = await axios.put(`${BASE_URL}/profile`, {
    avatarType: 'female'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Updated avatar to:', updateRes1.data.user.avatarType);

  // 3. PUT /api/profile (change avatar back to male)
  const updateRes2 = await axios.put(`${BASE_URL}/profile`, {
    avatarType: 'male'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Reverted avatar to:', updateRes2.data.user.avatarType);

  console.log('ALL PROFILE API TESTS PASSED SUCCESSFULLY!');
}

testProfileApi().catch(err => {
  console.error('Profile test failed:', err.response?.data || err.message);
  process.exit(1);
});
