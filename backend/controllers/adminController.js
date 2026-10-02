const User = require('../models/User');
const Search = require('../models/Search');
const IPRecord = require('../models/IPRecord');
const Notification = require('../models/Notification');
const apiConfig = require('../config/api');

/**
 * GET /api/admin/stats
 * Aggregates system-wide intelligence metrics for the Admin Dashboard
 */
async function getAdminStats(req, res, next) {
  try {
    const [totalUsers, activeUsers, totalSearches, totalIpsAnalyzed, recentUsers, recentSearches] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Search.countDocuments(),
      IPRecord.countDocuments(),
      User.find()
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Search.find()
        .sort({ searchedAt: -1 })
        .limit(5)
        .populate('userId', 'fullName email role')
        .populate('ipRecords')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalSearches,
        totalIpsAnalyzed,
        recentUsers,
        recentSearches: recentSearches.map(s => ({
          _id: s._id,
          searchNumber: s.searchNumber,
          searchedAt: s.searchedAt,
          ipCount: Array.isArray(s.ipRecords) ? s.ipRecords.length : 0,
          ipRecords: s.ipRecords,
          user: s.userId ? {
            _id: s.userId._id,
            fullName: s.userId.fullName,
            email: s.userId.email,
            role: s.userId.role
          } : null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users
 * Lists all registered users with search volume counts
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate search counts for each user
    const userSearchCounts = await Search.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    userSearchCounts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    const enrichedUsers = users.map((u, index) => ({
      index: index + 1,
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
      searchesCount: countMap[u._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      total: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users/:id
 * Retrieves detailed info and search activity for a specific user
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User with ID "${id}" was not found.`
      });
    }

    const [userSearchesCount, userIpsCount, recentSearches] = await Promise.all([
      Search.countDocuments({ userId: user._id }),
      IPRecord.countDocuments({ userId: user._id }),
      Search.find({ userId: user._id })
        .sort({ searchedAt: -1 })
        .limit(5)
        .populate('ipRecords')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      },
      stats: {
        totalSearches: userSearchesCount,
        ipsAnalyzed: userIpsCount
      },
      recentSearches
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Toggle user active/suspended state
 */
async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot deactivate their own account.'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const primaryAdminEmail = (process.env.ADMIN_EMAIL || apiConfig.auth?.adminEmail || 'admin@shadowtrace.local').toLowerCase();
    if (targetUser.email.toLowerCase() === primaryAdminEmail) {
      return res.status(403).json({
        success: false,
        error: 'The primary system administrator account cannot be deactivated.'
      });
    }

    targetUser.isActive = typeof isActive === 'boolean' ? isActive : !targetUser.isActive;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User "${targetUser.fullName}" is now ${targetUser.isActive ? 'Active' : 'Suspended'}.`,
      user: {
        _id: targetUser._id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently delete operative account and their search dossiers (Admin only)
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const primaryAdminEmail = (process.env.ADMIN_EMAIL || apiConfig.auth?.adminEmail || 'admin@shadowtrace.local').toLowerCase();
    if (targetUser.email.toLowerCase() === primaryAdminEmail) {
      return res.status(403).json({
        success: false,
        error: 'The primary system administrator account cannot be deleted.'
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot delete their own account.'
      });
    }

    // Delete associated searches, IP records, and notifications
    await Promise.all([
      User.findByIdAndDelete(id),
      Search.deleteMany({ userId: id }),
      IPRecord.deleteMany({ userId: id }),
      Notification.deleteMany({ userId: id })
    ]);

    res.status(200).json({
      success: true,
      message: `Operative dossier for "${targetUser.email}" and associated records permanently deleted.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser
};

