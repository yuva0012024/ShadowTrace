const mongoose = require('mongoose');
const Search = require('./models/Search');
const IPRecord = require('./models/IPRecord');
const User = require('./models/User');
require('dotenv').config();

async function showStoredDetails() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace';
  console.log(`Connecting to MongoDB (${uri})...\n`);
  await mongoose.connect(uri);

  // 1. Registered Users
  const users = await User.find().lean();
  console.log('========================================================================');
  console.log(`  REGISTERED USERS (${users.length})`);
  console.log('========================================================================');
  console.table(
    users.map((u) => ({
      ID: u._id.toString(),
      Name: u.fullName,
      Email: u.email,
      Role: u.role,
      Active: u.isActive,
      LastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'
    }))
  );

  // 2. Recent Searches
  const searches = await Search.find().populate('userId', 'fullName email').sort({ searchedAt: -1 }).limit(10).lean();
  console.log('\n========================================================================');
  console.log(`  LATEST SEARCH SESSIONS (Showing last 10 of total)`);
  console.log('========================================================================');
  console.table(
    searches.map((s) => ({
      SearchNumber: s.searchNumber,
      SearchedBy: s.userId ? `${s.userId.fullName} (${s.userId.email})` : 'Anonymous / Legacy',
      SearchedAt: new Date(s.searchedAt).toLocaleString()
    }))
  );

  // 3. Stored IP Geolocation Records
  const ipRecords = await IPRecord.find().sort({ searchedAt: -1 }).limit(10).lean();
  console.log('\n========================================================================');
  console.log(`  STORED IP INTELLIGENCE RECORDS (Showing last 10 of total)`);
  console.log('========================================================================');
  console.table(
    ipRecords.map((r) => ({
      IP: r.ipAddress,
      Country: r.country,
      City: r.city,
      ISP: r.isp?.length > 25 ? r.isp.substring(0, 22) + '...' : r.isp,
      Coordinates: r.latitude && r.longitude ? `${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}` : 'N/A',
      Date: new Date(r.searchedAt).toLocaleDateString()
    }))
  );

  console.log('\nDatabase summary:');
  const totalSearches = await Search.countDocuments();
  const totalIps = await IPRecord.countDocuments();
  console.log(` - Total Users: ${users.length}`);
  console.log(` - Total Search Sessions: ${totalSearches}`);
  console.log(` - Total Geolocation IP Records: ${totalIps}\n`);

  await mongoose.disconnect();
}

showStoredDetails().catch((err) => {
  console.error('Error fetching stored details:', err);
  process.exit(1);
});
