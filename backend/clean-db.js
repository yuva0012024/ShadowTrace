const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');
const Search = require('./models/Search');
const IPRecord = require('./models/IPRecord');
const OTP = require('./models/OTP');
const Notification = require('./models/Notification');

async function cleanDatabase() {
  await connectDB();

  console.log('[Safe Clean] Inspecting database before cleanup...');
  const allUsers = await User.find().lean();
  console.log(`[Safe Clean] Found ${allUsers.length} total users in DB.`);

  const adminUsers = allUsers.filter(u => u.role === 'admin');
  if (adminUsers.length === 0) {
    throw new Error('SAFETY CHECK FAILED: No admin account found! Aborting cleanup to protect admin.');
  }

  console.log(`[Safe Clean] Identified ${adminUsers.length} administrator account(s):`);
  adminUsers.forEach(a => {
    console.log(`   -> PRESERVED ADMIN: ID=${a._id}, Email=${a.email}, Role=${a.role}`);
  });

  const adminIds = adminUsers.map(a => a._id);

  // 1. Delete all non-admin users
  const userDeleteResult = await User.deleteMany({ role: { $ne: 'admin' } });
  console.log(`[Safe Clean] Deleted ${userDeleteResult.deletedCount} non-admin user accounts.`);

  // 2. Clear old test searches and IP analysis records
  const searchDeleteResult = await Search.deleteMany({});
  console.log(`[Safe Clean] Deleted ${searchDeleteResult.deletedCount} old test searches.`);

  const ipDeleteResult = await IPRecord.deleteMany({});
  console.log(`[Safe Clean] Deleted ${ipDeleteResult.deletedCount} old test IP records.`);

  // 3. Clear all temporary OTP records
  const otpDeleteResult = await OTP.deleteMany({});
  console.log(`[Safe Clean] Deleted ${otpDeleteResult.deletedCount} old temporary OTP records.`);

  // 4. Clear old notifications belonging to deleted users
  const notifDeleteResult = await Notification.deleteMany({ userId: { $nin: adminIds } });
  console.log(`[Safe Clean] Deleted ${notifDeleteResult.deletedCount} old test notifications.`);

  // 5. Verify the database state after cleanup
  console.log('\n================ POST-CLEANUP VERIFICATION ================');
  const remainingUsers = await User.find().lean();
  console.log(`Remaining Users in DB: ${remainingUsers.length}`);
  remainingUsers.forEach(u => {
    console.log(`   -> User ID: ${u._id} | Role: ${u.role} | Email: ${u.email} | Active: ${u.isActive}`);
    if (u.role !== 'admin') {
      console.error(`ERROR: Non-admin user still present: ${u.email}`);
    }
  });

  const remainingSearches = await Search.countDocuments();
  const remainingIPs = await IPRecord.countDocuments();
  const remainingOTPs = await OTP.countDocuments();

  console.log(`Remaining Searches: ${remainingSearches}`);
  console.log(`Remaining IP Records: ${remainingIPs}`);
  console.log(`Remaining OTP Records: ${remainingOTPs}`);

  if (remainingUsers.length === adminUsers.length && remainingUsers.every(u => u.role === 'admin')) {
    console.log('SUCCESS: All admin accounts preserved. All test data successfully removed.');
  } else {
    console.error('VERIFICATION WARNING: User count mismatch.');
  }
  console.log('===========================================================\n');

  await mongoose.connection.close();
}

cleanDatabase().catch(err => {
  console.error('[Safe Clean] Cleanup failed:', err);
  process.exit(1);
});
