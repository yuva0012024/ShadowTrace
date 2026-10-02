import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword } from '../services/api';
import {
  Shield,
  ShieldCheck,
  User,
  Key,
  Calendar,
  Clock,
  Mail,
  Search,
  Crosshair,
  Lock,
  Check,
  AlertCircle,
  Loader2,
  Users,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';
import userAvatarMaleImg from '../assets/images/user-avatar.png';
import userAvatarFemaleImg from '../assets/images/user-avatar-female.png';

export default function Profile() {
  const { user: authUser, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // Profile Edit Form State
  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('male');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // Location Permission State from Device/Local storage
  const [locationPermission] = useState(() => {
    const stored = localStorage.getItem('shadowtrace_location_permission');
    if (stored === 'granted') return 'GRANTED';
    if (stored === 'denied') return 'DENIED';
    return 'NOT CONFIGURED';
  });

  useEffect(() => {
    async function fetchProfileData() {
      try {
        setLoading(true);
        setError(null);
        const res = await getProfile();
        if (res.success && res.user) {
          setProfileData(res.user);
          setStats(res.stats);
          setFullName(res.user.fullName || '');
          setSelectedAvatar(res.user.avatarType || 'male');
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load operative profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setUpdateError(null);
      setUpdateSuccess(false);

      if (!fullName.trim()) {
        setUpdateError('Full name cannot be empty.');
        setUpdating(false);
        return;
      }

      const res = await updateProfile({
        fullName: fullName.trim(),
        avatarType: selectedAvatar
      });

      if (res.success && res.user) {
        setProfileData(res.user);
        updateUser(res.user);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 4000);
      }
    } catch (err) {
      setUpdateError(err.response?.data?.error || err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      setPasswordUpdating(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      if (!currentPassword || !newPassword) {
        setPasswordError('Both current password and new password are required.');
        setPasswordUpdating(false);
        return;
      }

      if (newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters in length.');
        setPasswordUpdating(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match. Please verify.');
        setPasswordUpdating(false);
        return;
      }

      const res = await changePassword({
        currentPassword,
        newPassword
      });

      if (res.success) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 5000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.error || err.message || 'Failed to update credentials.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Helper date formatter
  const formatMonthYear = (dateStr) => {
    if (!dateStr) return 'Active Operative';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Active Operative';
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'First session initiated';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return 'Recently active';
    }
  };

  const userRole = profileData?.role || authUser?.role || 'user';
  const isAdmin = userRole === 'admin';
  const currentAvatarSrc = (profileData?.avatarType === 'female' || selectedAvatar === 'female')
    ? userAvatarFemaleImg
    : userAvatarMaleImg;

  if (loading) {
    return (
      <div className="page-container profile-page">
        <div className="profile-loading-state">
          <Loader2 size={36} className="spin-loader text-gold" />
          <span className="mono-font">ACCESSING CLASSIFIED OPERATIVE DOSSIER...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container profile-page">
      {/* Background shadow silhouette watermark */}
      <div className="profile-agent-watermark">
        <img src={shadowAgentImg} alt="Shadow Intelligence Agent" />
      </div>

      {/* Header */}
      <div className="profile-header-section">
        <div className="profile-header-title-wrap">
          <div className="profile-classification-badge">
            <Shield size={13} className="text-gold" />
            <span>CLASSIFIED DOSSIER // TOP SECRET</span>
          </div>
          <h1 className="profile-title">ShadowTrace Intelligence Profile</h1>
          <p className="profile-subtitle">
            Authenticated operative credentials, cryptographic access privileges, and analytical records.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* HERO 3D CARD */}
      <div className="profile-hero-card-3d">
        <div className="profile-hero-card-glow" />
        <div className="profile-hero-inner">
          <div className="profile-avatar-column">
            <div className="profile-avatar-3d-frame">
              <img
                src={currentAvatarSrc}
                alt={profileData?.fullName}
                className="profile-avatar-3d-img"
              />
              <span className="profile-avatar-status-pill">
                <span className="status-dot-green pulse-live" />
                ACTIVE
              </span>
            </div>
          </div>

          <div className="profile-hero-meta-column">
            <div className="profile-hero-top-row">
              <div>
                <span className="profile-role-tag">
                  {isAdmin ? 'ADMINISTRATOR' : 'OPERATIVE'}
                </span>
                <h2 className="profile-hero-name">{profileData?.fullName}</h2>
                <div className="profile-hero-email">
                  <Mail size={14} className="text-gold" />
                  <span className="mono-font">{profileData?.email}</span>
                </div>
              </div>

              <div className="profile-clearance-box">
                <span className="profile-clearance-label">CLEARANCE LEVEL</span>
                <span className="profile-clearance-value">
                  {isAdmin ? 'LEVEL 5 • PRIVILEGED MASTER' : 'LEVEL 2 • FIELD ANALYST'}
                </span>
                <div className="profile-clearance-meter">
                  <div
                    className="profile-clearance-fill"
                    style={{ width: isAdmin ? '100%' : '65%' }}
                  />
                </div>
              </div>
            </div>

            <div className="profile-hero-footer-row">
              <div className="hero-stat-pill">
                <Calendar size={14} className="text-gold" />
                <span className="hero-stat-label">Member Since:</span>
                <span className="hero-stat-val">{formatMonthYear(profileData?.createdAt)}</span>
              </div>

              <div className="hero-stat-pill">
                <Clock size={14} className="text-gold" />
                <span className="hero-stat-label">Last Login:</span>
                <span className="hero-stat-val">{formatTimestamp(profileData?.lastLoginAt)}</span>
              </div>

              <div className="hero-stat-pill">
                <ShieldCheck size={14} className="text-gold" />
                <span className="hero-stat-label">Account:</span>
                <span className="hero-stat-val status-active-text">● ACTIVE</span>
              </div>

              <div className="hero-stat-pill">
                <Mail size={14} className="text-gold" />
                <span className="hero-stat-label">Email:</span>
                <span className="hero-stat-val status-active-text">● VERIFIED</span>
              </div>

              <div className="hero-stat-pill">
                <Crosshair size={14} className="text-gold" />
                <span className="hero-stat-label">Location:</span>
                <span className="hero-stat-val" style={{ color: locationPermission === 'GRANTED' ? '#4ade80' : (locationPermission === 'DENIED' ? '#ef4444' : '#C8A23A') }}>
                  {locationPermission}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN WORKSPACE: Left Customization & Edit, Right Metrics & Security */}
      <div className="profile-workspace-grid">
        {/* Left Column: Avatar Customization + Edit Form */}
        <div className="profile-workspace-col">
          <div className="profile-panel-card">
            <div className="panel-header-with-icon">
              <Sparkles size={18} className="panel-icon text-gold" />
              <div>
                <h3 className="panel-title">Operative Customization</h3>
                <p className="panel-subtitle">Configure your public visual identity and name</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              {updateSuccess && (
                <div className="alert-success">
                  <Check size={16} />
                  <span>Profile updated successfully.</span>
                </div>
              )}

              {updateError && (
                <div className="alert-error">
                  <AlertCircle size={16} />
                  <span>{updateError}</span>
                </div>
              )}

              {/* Avatar Selection Grid */}
              <div className="form-group">
                <label className="form-label">
                  SELECT AVATAR
                  <span className="form-label-hint">Choose your intelligence operative visual representation</span>
                </label>

                <div className="avatar-selection-grid">
                  {/* Male Avatar Option */}
                  <div
                    className={`avatar-option-card ${selectedAvatar === 'male' ? 'active' : ''}`}
                    onClick={() => setSelectedAvatar('male')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="avatar-preview-box">
                      <img src={userAvatarMaleImg} alt="Male Operative Avatar" />
                      {selectedAvatar === 'male' && (
                        <div className="avatar-selected-badge">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                    <span className="avatar-option-name">Male Avatar</span>
                    <span className="avatar-option-desc">Tactical Noir operative</span>
                  </div>

                  {/* Female Avatar Option */}
                  <div
                    className={`avatar-option-card ${selectedAvatar === 'female' ? 'active' : ''}`}
                    onClick={() => setSelectedAvatar('female')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="avatar-preview-box">
                      <img src={userAvatarFemaleImg} alt="Female Operative Avatar" />
                      {selectedAvatar === 'female' && (
                        <div className="avatar-selected-badge">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                    <span className="avatar-option-name">Female Avatar</span>
                    <span className="avatar-option-desc">Special Intelligence operative</span>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  FULL NAME
                </label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    id="fullName"
                    className="st-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter operative name..."
                    required
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="form-group">
                <label className="form-label">
                  EMAIL ADDRESS (LOCKED)
                  <span className="form-label-hint">Cryptographically bound to operative credential</span>
                </label>
                <div className="input-with-icon disabled">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    className="st-input"
                    value={profileData?.email || ''}
                    disabled
                  />
                  <Lock size={14} className="input-lock-icon" />
                </div>
              </div>

              {/* Role Display */}
              <div className="form-group">
                <label className="form-label">ASSIGNED ROLE</label>
                <div className="role-readout-pill">
                  <ShieldCheck size={16} className="text-gold" />
                  <span className="role-readout-text">
                    {isAdmin ? 'ADMINISTRATOR — Full System Privileges' : 'OPERATIVE — Field Analysis Access'}
                  </span>
                </div>
              </div>

              <div className="profile-form-footer">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 size={16} className="spin-loader" />
                      <span>SAVING CHANGES...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>SAVE CHANGES</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Information Cards & Security Section */}
        <div className="profile-workspace-col">
          {/* Intelligence Statistics Dossier Cards */}
          <div className="profile-stats-grid">
            <div className="profile-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">ACCOUNT STATUS</span>
                <ShieldCheck size={18} className="text-gold" />
              </div>
              <div className="stat-card-value status-active-text">ACTIVE</div>
              <span className="stat-card-meta">Live Cryptographic Session</span>
            </div>

            <div className="profile-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">ACCOUNT ROLE</span>
                <Shield size={18} className="text-gold" />
              </div>
              <div className="stat-card-value">
                {isAdmin ? 'ADMINISTRATOR' : 'USER'}
              </div>
              <span className="stat-card-meta">
                {isAdmin ? 'Full clearance' : 'Standard analyst'}
              </span>
            </div>

            <div className="profile-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">SEARCHES PERFORMED</span>
                <Search size={18} className="text-gold" />
              </div>
              <div className="stat-card-value mono-font">
                {stats?.searchesPerformed !== undefined ? stats.searchesPerformed : '0'}
              </div>
              <span className="stat-card-meta">Logged database sessions</span>
            </div>

            <div className="profile-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">IPS ANALYZED</span>
                <Crosshair size={18} className="text-gold" />
              </div>
              <div className="stat-card-value mono-font">
                {stats?.ipsAnalyzed !== undefined ? stats.ipsAnalyzed : '0'}
              </div>
              <span className="stat-card-meta">Resolved geolocations</span>
            </div>
          </div>

          {/* Admin System Metrics (If Administrator) */}
          {isAdmin && stats?.adminMetrics && (
            <div className="profile-panel-card admin-overview-panel">
              <div className="panel-header-with-icon">
                <Activity size={18} className="panel-icon text-gold" />
                <div>
                  <h3 className="panel-title">System-Wide Intelligence Overview</h3>
                  <p className="panel-subtitle">Aggregate metrics across all operatives in database</p>
                </div>
              </div>

              <div className="admin-metrics-row">
                <div className="admin-metric-box">
                  <Users size={16} className="text-gold" />
                  <span className="admin-metric-count mono-font">
                    {stats.adminMetrics.totalUsers}
                  </span>
                  <span className="admin-metric-title">Total Users</span>
                </div>

                <div className="admin-metric-box">
                  <Layers size={16} className="text-gold" />
                  <span className="admin-metric-count mono-font">
                    {stats.adminMetrics.totalSearches}
                  </span>
                  <span className="admin-metric-title">Total Searches</span>
                </div>

                <div className="admin-metric-box">
                  <Crosshair size={16} className="text-gold" />
                  <span className="admin-metric-count mono-font">
                    {stats.adminMetrics.totalIps}
                  </span>
                  <span className="admin-metric-title">Total IPs Tracked</span>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY & CREDENTIALS SECTION */}
          <div className="profile-panel-card security-panel-card">
            <div className="panel-header-with-icon">
              <Lock size={18} className="panel-icon text-gold" />
              <div>
                <h3 className="panel-title">Security & Cryptographic Credentials</h3>
                <p className="panel-subtitle">Manage session tokens and authentication password</p>
              </div>
            </div>

            <div className="security-status-grid">
              <div className="security-status-item">
                <span className="security-item-label">Authentication Status</span>
                <span className="security-item-value text-green">
                  ● Authenticated (JWT 256-bit Token)
                </span>
              </div>

              <div className="security-status-item">
                <span className="security-item-label">Email Verification Status</span>
                <span className="security-item-value text-green">
                  ● VERIFIED (Secured via OTP Protocol)
                </span>
              </div>

              <div className="security-status-item">
                <span className="security-item-label">Device Geolocation Status</span>
                <span className="security-item-value" style={{ color: locationPermission === 'GRANTED' ? '#4ade80' : (locationPermission === 'DENIED' ? '#ef4444' : '#C8A23A') }}>
                  ● {locationPermission}
                </span>
              </div>

              <div className="security-status-item">
                <span className="security-item-label">Account Clearance</span>
                <span className="security-item-value text-gold">
                  {isAdmin ? 'Privileged Administrator' : 'Verified Field Analyst'}
                </span>
              </div>

              <div className="security-status-item">
                <span className="security-item-label">Last Login Timestamp</span>
                <span className="security-item-value mono-font">
                  {formatTimestamp(profileData?.lastLoginAt)}
                </span>
              </div>

              <div className="security-status-item">
                <span className="security-item-label">Session Security</span>
                <span className="security-item-value text-green">
                  Encrypted Local & TLS Active
                </span>
              </div>
            </div>

            <div className="dropdown-divider" style={{ margin: '20px 0' }} />

            <h4 className="security-subheading">
              <Key size={15} className="text-gold" />
              Change Security Password
            </h4>

            <form onSubmit={handlePasswordSubmit} className="password-change-form">
              {passwordSuccess && (
                <div className="alert-success">
                  <Check size={16} />
                  <span>Security credentials updated successfully.</span>
                </div>
              )}

              {passwordError && (
                <div className="alert-error">
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="currentPassword">
                  CURRENT PASSWORD
                </label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    id="currentPassword"
                    className="st-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password..."
                    required
                  />
                </div>
              </div>

              <div className="form-row-split">
                <div className="form-group">
                  <label className="form-label" htmlFor="newPassword">
                    NEW PASSWORD
                  </label>
                  <div className="input-with-icon">
                    <Key size={16} className="input-icon" />
                    <input
                      type="password"
                      id="newPassword"
                      className="st-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">
                    CONFIRM NEW PASSWORD
                  </label>
                  <div className="input-with-icon">
                    <Key size={16} className="input-icon" />
                    <input
                      type="password"
                      id="confirmPassword"
                      className="st-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password..."
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-secondary"
                disabled={passwordUpdating}
                style={{ marginTop: '12px' }}
              >
                {passwordUpdating ? (
                  <>
                    <Loader2 size={16} className="spin-loader" />
                    <span>UPDATING CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>UPDATE PASSWORD</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
