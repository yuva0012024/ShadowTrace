const User = require('../models/User');
const Search = require('../models/Search');
const IPRecord = require('../models/IPRecord');
const apiConfig = require('./api');

/**
 * Initializes or verifies the administrator account in MongoDB.
 * Ensures the password is securely hashed and the role is 'admin'.
 */
async function seedAdmin() {
  try {
    const { adminEmail, adminPassword, adminName } = apiConfig.auth;

    if (!adminEmail || !adminPassword) {
      console.warn('[Admin Seed] Admin credentials not fully configured in environment.');
      return null;
    }

    // Demote any previously seeded accounts that are not the currently configured admin email
    await User.updateMany(
      { email: { $ne: adminEmail.toLowerCase() }, role: 'admin' },
      { $set: { role: 'user' } }
    );

    const adminEmails = [
      adminEmail.toLowerCase()
    ];

    let primaryAdmin = null;

    for (const email of adminEmails) {
      let admin = await User.findOne({ email }).select('+passwordHash');
      if (!admin) {
        const passwordHash = await User.hashPassword(adminPassword);
        admin = new User({
          fullName: email === adminEmail ? adminName : 'System Administrator',
          email,
          passwordHash,
          role: 'admin',
          avatarType: 'male',
          isActive: true,
          lastLoginAt: null
        });
        await admin.save();
        console.log(`[Admin Seed] Secure Admin account created: ${email}`);
      } else {
        let needsSave = false;
        const matchesPass = await admin.comparePassword(adminPassword);
        if (!matchesPass) {
          admin.passwordHash = await User.hashPassword(adminPassword);
          needsSave = true;
          console.log(`[Admin Seed] Password synchronized for administrator: ${email}`);
        }
        if (admin.role !== 'admin') {
          admin.role = 'admin';
          needsSave = true;
        }
        if (!admin.isActive) {
          admin.isActive = true;
          needsSave = true;
        }
        if (needsSave) {
          await admin.save();
          console.log(`[Admin Seed] Existing user updated to Administrator: ${email}`);
        }
      }

      if (email === adminEmail.toLowerCase()) {
        primaryAdmin = admin;
      }
    }
    const admin = primaryAdmin || (await User.findOne({ email: adminEmail.toLowerCase() }));

    // Associate any legacy searches (created before auth) with the admin account
    // so no historical data is orphaned
    const legacySearchesCount = await Search.countDocuments({ userId: null });
    if (legacySearchesCount > 0 && admin) {
      await Search.updateMany({ userId: null }, { $set: { userId: admin._id } });
      await IPRecord.updateMany({ userId: null }, { $set: { userId: admin._id } });
      console.log(`[Admin Seed] Associated ${legacySearchesCount} legacy search sessions with Admin account.`);
    }

    return admin;
  } catch (error) {
    console.error('[Admin Seed] Failed to seed/verify admin account:', error.message);
    return null;
  }
}

module.exports = seedAdmin;
