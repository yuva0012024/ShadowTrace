const User = require('../models/User');
const Search = require('../models/Search');
const IPRecord = require('../models/IPRecord');
const { createNotification } = require('../services/notificationService');

/**
 * GET /api/profile
 * Retrieve authenticated operative profile and live statistical dossier
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found.'
      });
    }

    // Real database counts for this specific user
    const searchesPerformed = await Search.countDocuments({ userId: user._id });
    const ipsAnalyzed = await IPRecord.countDocuments({ userId: user._id });

    const stats = {
      searchesPerformed,
      ipsAnalyzed,
      accountStatus: user.isActive ? 'ACTIVE' : 'DEACTIVATED',
      memberSince: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    // If user is administrator, include system-wide intelligence metrics
    if (user.role === 'admin') {
      const [totalUsers, totalSearches, totalIps] = await Promise.all([
        User.countDocuments(),
        Search.countDocuments(),
        IPRecord.countDocuments()
      ]);
      stats.adminMetrics = {
        totalUsers,
        totalSearches,
        totalIps
      };
    }

    res.status(200).json({
      success: true,
      user: user.toJSON(),
      stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile
 * Update profile details (Full Name, Avatar Type)
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { fullName, avatarType } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found.'
      });
    }

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid full name.'
        });
      }
      user.fullName = fullName.trim();
    }

    if (avatarType !== undefined) {
      if (!['male', 'female'].includes(avatarType)) {
        return res.status(400).json({
          success: false,
          error: 'Avatar selection must be either "male" or "female".'
        });
      }
      user.avatarType = avatarType;
    }

    await user.save();

    await createNotification(
      userId,
      'profile_update',
      'Dossier Profile Updated',
      'Operative dossier details modified successfully.'
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/change-password
 * Securely change account credentials
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Both current password and new password are required.'
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters in length.'
      });
    }

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found.'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current security password is incorrect.'
      });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    await createNotification(
      userId,
      'password_change',
      'Security Cipher Code Updated',
      'Operative security cipher updated successfully.'
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
