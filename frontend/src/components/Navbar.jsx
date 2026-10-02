import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getNotifications } from '../services/api';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Laptop,
  ChevronDown,
  Menu,
  LogOut,
  ShieldCheck,
  UserCheck,
  User,
  History,
  Settings,
  Check
} from 'lucide-react';
import userAvatarImg from '../assets/images/user-avatar.png';
import userAvatarFemaleImg from '../assets/images/user-avatar-female.png';

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);
  const themeMenuRef = useRef(null);

  // Load unread notifications count
  useEffect(() => {
    let isMounted = true;
    async function loadAlerts() {
      try {
        const data = await getNotifications(1);
        if (isMounted && data && data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silent in navbar
      }
    }
    loadAlerts();
    window.addEventListener('shadowtrace_notifications_updated', loadAlerts);
    return () => {
      isMounted = false;
      window.removeEventListener('shadowtrace_notifications_updated', loadAlerts);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/analyze?ip=${encodeURIComponent(trimmed)}`);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.fullName || 'Operative';
  const displayRole = user?.role === 'admin' ? 'ADMINISTRATOR' : 'OPERATIVE';
  const avatarSrc = user?.avatarType === 'female' ? userAvatarFemaleImg : userAvatarImg;

  const themeOptions = [
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Charcoal & Gold Surveillance' },
    { id: 'light', label: 'Light', icon: Sun, description: 'Crisp Warm Intelligence' },
    { id: 'system', label: 'System Default', icon: Laptop, description: 'Sync with OS Preferences' }
  ];

  return (
    <header className="app-navbar">
      {/* Mobile Toggle Button */}
      <button
        className="mobile-hamburger-btn"
        onClick={onToggleSidebar}
        aria-label="Open Navigation Menu"
      >
        <Menu size={20} />
      </button>

      {/* Center/Left Quick Search Bar */}
      <div className="navbar-search-wrapper">
        <form onSubmit={handleSearchSubmit} className="navbar-search-form">
          <Search size={16} className="navbar-search-icon" />
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search IP address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Quick search IP address"
          />
        </form>
      </div>

      {/* Right Controls: Notifications, Theme Switcher, Profile */}
      <div className="navbar-actions">
        {/* Notification Bell */}
        <button
          type="button"
          className="navbar-icon-btn navbar-bell-btn"
          aria-label={`Notifications (${unreadCount} unread)`}
          title="Intelligence Alerts"
          onClick={() => navigate('/notifications')}
          id="navbar-notification-bell-btn"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="navbar-unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            <span className="notification-dot" />
          )}
        </button>

        {/* Theme Switcher Menu */}
        <div className="navbar-theme-menu-wrapper" ref={themeMenuRef}>
          <button
            type="button"
            className={`navbar-icon-btn ${themeMenuOpen ? 'active' : ''}`}
            aria-label={`Current Theme: ${themeMode} (${resolvedTheme})`}
            title={`Theme Mode: ${themeMode.toUpperCase()}`}
            onClick={() => setThemeMenuOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={themeMenuOpen}
          >
            {resolvedTheme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {themeMenuOpen && (
            <div className="navbar-theme-dropdown" role="menu">
              <div className="dropdown-menu-header">
                <span className="dropdown-menu-title">THEME MODE</span>
                <span className="dropdown-menu-subtitle">Active: {themeMode.toUpperCase()}</span>
              </div>
              <div className="dropdown-divider" />
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`theme-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setThemeMode(opt.id);
                      setThemeMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <Icon size={16} className="theme-opt-icon" />
                    <div className="theme-opt-text">
                      <span className="theme-opt-label">{opt.label}</span>
                      <span className="theme-opt-desc">{opt.description}</span>
                    </div>
                    {isSelected && <Check size={14} className="theme-opt-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile with Dropdown */}
        <div className="navbar-user-profile-wrapper" ref={dropdownRef}>
          <div
            className="navbar-user-profile"
            onClick={() => setDropdownOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="navbar-user-avatar-frame">
              <img
                src={avatarSrc}
                alt={displayName}
                className="navbar-user-avatar-img"
              />
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{displayName}</span>
              <span className="navbar-user-role">{displayRole}</span>
            </div>
            <ChevronDown size={14} className={`navbar-user-chevron ${dropdownOpen ? 'rotated' : ''}`} />
          </div>

          {dropdownOpen && (
            <div className="navbar-profile-dropdown" role="menu">
              <div className="dropdown-user-header">
                <span className="dropdown-user-name">{displayName}</span>
                <span className="dropdown-user-email">{user?.email}</span>
                <span className={`dropdown-role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
                  {user?.role === 'admin' ? 'ADMINISTRATOR' : 'OPERATIVE'}
                </span>
              </div>

              <div className="dropdown-divider" />

              <Link
                to="/profile"
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                <User size={16} className="dropdown-item-icon" />
                <span>Profile</span>
              </Link>

              <Link
                to="/settings"
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                <Settings size={16} className="dropdown-item-icon" />
                <span>Settings</span>
              </Link>

              {user?.role === 'admin' && (
                <>
                  <div className="dropdown-divider" />
                  <Link
                    to="/admin"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <ShieldCheck size={16} className="dropdown-item-icon" />
                    <span>Admin Intelligence</span>
                  </Link>

                  <Link
                    to="/admin/users"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <UserCheck size={16} className="dropdown-item-icon" />
                    <span>User Management</span>
                  </Link>
                </>
              )}

              <Link
                to="/history"
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                <History size={16} className="dropdown-item-icon" />
                <span>Search History</span>
              </Link>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-item dropdown-logout-btn"
                onClick={handleLogout}
                role="menuitem"
              >
                <LogOut size={16} className="dropdown-item-icon" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
