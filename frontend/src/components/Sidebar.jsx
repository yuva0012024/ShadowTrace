import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  History,
  Download,
  Settings,
  ShieldCheck,
  Users,
  User,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoSvg from '../assets/logo/logo.svg';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const standardNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analyze', label: 'Analyze IP', icon: Search },
    { to: '/history', label: 'Search History', icon: History },
    { to: '/export', label: 'Export', icon: Download },
    { to: '/profile', label: 'Operative Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const adminNavItems = [
    { to: '/admin', label: 'Admin Command', icon: ShieldCheck },
    { to: '/admin/users', label: 'Registered Users', icon: Users },
  ];

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-backdrop"
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Top Branding */}
        <div className="sidebar-brand-container">
          <div className="sidebar-brand-inner">
            <img src={logoSvg} alt="ShadowTrace" className="sidebar-emblem" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">SHADOWTRACE</span>
              <span className="sidebar-brand-tagline">TRACE • ANALYZE • REVEAL</span>
            </div>
          </div>

          {isOpen && (
            <button
              onClick={onClose}
              className="sidebar-close-btn"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {standardNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} className="sidebar-link-icon" />
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            );
          })}

          {/* Admin Navigation Section (Admin Only) */}
          {user?.role === 'admin' && (
            <div className="sidebar-section-admin">
              <div className="sidebar-section-divider" />
              <div className="sidebar-section-header">ADMINISTRATION</div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `sidebar-link admin-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon size={18} className="sidebar-link-icon" />
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* Sign Out link in sidebar */}
          <button
            type="button"
            className="sidebar-link sidebar-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={18} className="sidebar-link-icon" />
            <span className="sidebar-link-label">Sign Out</span>
          </button>
        </nav>

        {/* Agent Visual Silhouette & Tagline at bottom of sidebar */}
        <div className="sidebar-agent-section">
          <div className="sidebar-agent-wrapper">
            <img
              src={shadowAgentImg}
              alt="ShadowTrace Intelligence Agent"
              className="sidebar-agent-img"
              loading="lazy"
            />
            <div className="sidebar-agent-overlay" />
          </div>
          <div className="sidebar-agent-quote">
            “Every signal leaves a trace.<br />Follow it.”
          </div>
        </div>

        {/* Bottom Status Badge */}
        <div className="sidebar-bottom-status">
          <div className="status-indicator-badge">
            <span className="status-dot-green pulse-live" />
            <span className="status-label-text">
              {user?.role === 'admin' ? 'SYSTEM PRIVILEGED' : 'INTELLIGENCE GRID ACTIVE'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
