const {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../services/notificationService');

/**
 * GET /api/notifications
 * Get authenticated user's notifications and unread counter
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user._id;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const result = await getUserNotifications(userId, limit);

    res.status(200).json({
      success: true,
      unreadCount: result.unreadCount,
      notifications: result.notifications
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const updated = await markNotificationRead(notificationId, userId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for current user as read
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user._id;
    await markAllNotificationsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
