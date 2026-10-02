import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Shield,
  Crosshair,
  Layers,
  Download,
  KeyRound,
  UserCheck,
  Clock,
  Inbox
} from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'recon' | 'security'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(50);
      if (data && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[Notifications] Failed to load alerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event('shadowtrace_notifications_updated'));
    } catch (err) {
      console.error('[Notifications] Failed to mark read:', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('shadowtrace_notifications_updated'));
    } catch (err) {
      console.error('[Notifications] Failed to mark all read:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'analysis':
        return <Crosshair size={18} className="text-gold" />;
      case 'batch_analysis':
        return <Layers size={18} className="text-gold" />;
      case 'export':
        return <Download size={18} className="text-gold" />;
      case 'login':
        return <KeyRound size={18} className="text-gold" />;
      case 'security':
        return <Shield size={18} className="text-gold" />;
      case 'profile_update':
      case 'password_change':
        return <UserCheck size={18} className="text-gold" />;
      default:
        return <Bell size={18} className="text-gold" />;
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'recon') return item.type === 'analysis' || item.type === 'batch_analysis';
    if (filter === 'security') return item.type === 'security' || item.type === 'login' || item.type === 'password_change';
    return true;
  });

  return (
    <div className="page-container notifications-page">
      {/* Header with Title and Actions */}
      <div className="notifications-header-bar">
        <div className="notifications-header-left">
          <div className="notifications-icon-badge">
            <Bell size={22} className="text-gold" />
          </div>
          <div>
            <h1 className="notifications-title">INTELLIGENCE ALERT CENTER</h1>
            <p className="notifications-subtitle">
              Live telemetry and forensic event log across operative session activities.
            </p>
          </div>
        </div>

        <div className="notifications-header-right">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-btn-mark-all"
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              id="notif-mark-all-btn"
            >
              <CheckCheck size={16} />
              <span>MARK ALL AS READ</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-bar">
        <div className="notif-filter-group" role="tablist">
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>ALL ALERTS</span>
            <span className="notif-count-pill">{notifications.length}</span>
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            <span>UNREAD</span>
            {unreadCount > 0 && <span className="notif-unread-count-pill">{unreadCount}</span>}
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'recon' ? 'active' : ''}`}
            onClick={() => setFilter('recon')}
          >
            <span>RECONNAISSANCE</span>
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'security' ? 'active' : ''}`}
            onClick={() => setFilter('security')}
          >
            <span>SECURITY & CLEARANCE</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list-container">
        {loading ? (
          <div className="notif-loading-state">
            <div className="health-spinner" style={{ width: '28px', height: '28px' }} />
            <span>Scanning encrypted telemetry log...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty-card">
            <Inbox size={42} className="text-gold-muted" />
            <h3 className="notif-empty-title">ALL SIGNALS MONITORED</h3>
            <p className="notif-empty-subtitle">
              {filter === 'unread'
                ? 'No unread intelligence alerts. All activity acknowledged.'
                : 'No recorded intelligence alerts matching the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="notif-items-stack">
            {filteredNotifications.map((notif) => (
              <div
                key={notif._id}
                className={`notif-item-card ${notif.isRead ? 'read' : 'unread'}`}
                onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
              >
                <div className="notif-item-left">
                  <div className="notif-item-icon-shell">
                    {getNotificationIcon(notif.type)}
                  </div>
                  {!notif.isRead && <span className="notif-item-live-dot" />}
                </div>

                <div className="notif-item-content">
                  <div className="notif-item-header">
                    <span className="notif-item-title">{notif.title}</span>
                    <span className="notif-item-time">
                      <Clock size={12} />
                      <span>{new Date(notif.createdAt).toLocaleString()}</span>
                    </span>
                  </div>
                  <p className="notif-item-message">{notif.message}</p>
                </div>

                <div className="notif-item-actions">
                  {!notif.isRead ? (
                    <button
                      type="button"
                      className="notif-mark-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif._id);
                      }}
                      title="Mark as read"
                    >
                      <Check size={14} />
                      <span>Mark Read</span>
                    </button>
                  ) : (
                    <span className="notif-read-badge">ACKNOWLEDGED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
