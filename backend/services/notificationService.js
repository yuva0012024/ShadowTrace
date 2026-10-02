const Notification = require('../models/Notification');

/**
 * Creates a new notification record in MongoDB tied to an application event
 */
async function createNotification(userId, type, title, message, metadata = {}) {
  try {
    if (!userId) return null;

    const notif = new Notification({
      userId,
      type,
      title,
      message,
      metadata,
      isRead: false,
      createdAt: new Date()
    });

    return await notif.save();
  } catch (error) {
    console.error('[Notification Service] Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Retrieves notifications for a specific user with pagination
 */
async function getUserNotifications(userId, limit = 30) {
  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    });

    return {
      notifications,
      unreadCount
    };
  } catch (error) {
    console.error('[Notification Service] Failed to fetch notifications:', error.message);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Marks a single notification as read
 */
async function markNotificationRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
}

/**
 * Marks all notifications for a user as read
 */
async function markAllNotificationsRead(userId) {
  return Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
