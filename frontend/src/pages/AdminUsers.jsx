import React, { useEffect, useState } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Eye,
  RefreshCw,
  X,
  Calendar,
  Clock,
  Mail,
  Shield,
  Trash2
} from 'lucide-react';
import { 
  getAdminUsers, 
  toggleAdminUserStatus, 
  getAdminUserById,
  deleteAdminUser 
} from '../services/api';
import { formatTableDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers();
      if (res.success && res.users) {
        setUsers(res.users);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load registered operatives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    if (user._id === currentAdmin?._id) {
      alert('Administrators cannot alter their own active status.');
      return;
    }

    const nextState = !user.isActive;
    const confirmMsg = nextState
      ? `Activate operative account for "${user.fullName}"?`
      : `Suspend operative clearance for "${user.fullName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(user._id);
      const res = await toggleAdminUserStatus(user._id, nextState);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isActive: nextState } : u))
        );
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleInspectUser = async (userId) => {
    try {
      setActionLoading(userId);
      const res = await getAdminUserById(userId);
      if (res.success && res.user) {
        setSelectedUser({ ...res.user, stats: res.stats, recentSearches: res.recentSearches });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch user dossier.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      const res = await deleteAdminUser(userToDelete._id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
        setUserToDelete(null);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete operative account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchFilter.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-container admin-users-page">
      {error && (
        <div className="alert-error">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Page Title & Controls */}
      <div className="admin-page-header">
        <div>
          <div className="admin-badge-sub">INTELLIGENCE REGISTRY</div>
          <h1 className="admin-main-heading">REGISTERED OPERATIVES</h1>
          <p className="admin-sub-text">
            Comprehensive clearance registry of all authenticated platform users and access levels.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-gold-outline"
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="history-table-card">
        {/* Table Search Toolbar */}
        <div className="table-toolbar">
          <div className="table-search-box">
            <Search size={16} className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Filter operatives by name, email, or role..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <div className="table-count-badge">
            Showing <span className="text-gold">{filteredUsers.length}</span> of {users.length} Operatives
          </div>
        </div>

        {/* Users Table */}
        <div className="table-responsive-wrapper">
          <table className="shadowtrace-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>User Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered At</th>
                <th>Last Login</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="table-empty-cell">
                    Loading registered operatives directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty-cell">
                    {searchFilter ? 'No operatives match the search filter.' : 'No operatives registered yet.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const isSelf = u._id === currentAdmin?._id;
                  const isActioning = actionLoading === u._id;

                  return (
                    <tr key={u._id}>
                      <td className="table-cell-index">{index + 1}</td>
                      <td className="table-cell-name">
                        <div className="user-name-bold">{u.fullName}</div>
                        {isSelf && <span className="self-tag">(Current Session)</span>}
                      </td>
                      <td className="table-cell-email mono-font">
                        {u.email}
                      </td>
                      <td>
                        <span className={`role-tag ${u.role === 'admin' ? 'admin' : 'user'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.isActive ? 'active' : 'suspended'}`}>
                          {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="mono-font table-cell-time">
                        {formatTableDate(u.createdAt)}
                      </td>
                      <td className="mono-font table-cell-time">
                        {u.lastLoginAt ? formatTableDate(u.lastLoginAt) : 'Never'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="table-actions-group">
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => handleInspectUser(u._id)}
                            title="Inspect Operative Dossier"
                          >
                            <Eye size={13} />
                            <span>Dossier</span>
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              className={`table-action-btn ${u.isActive ? 'btn-action-suspend' : 'btn-action-activate'}`}
                              onClick={() => handleToggleStatus(u)}
                              disabled={isActioning}
                              title={u.isActive ? 'Suspend Operative' : 'Activate Operative'}
                            >
                              {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                              <span>{u.isActive ? 'Suspend' : 'Activate'}</span>
                            </button>
                          )}

                          {!isSelf && u.role !== 'admin' && (
                            <button
                              type="button"
                              className="table-action-btn btn-action-delete"
                              onClick={() => setUserToDelete(u)}
                              disabled={isActioning || isDeleting}
                              title="Permanently Expel Operative"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operative Dossier Modal */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Shield className="gold-icon" size={20} />
                <h3 className="modal-title">OPERATIVE DOSSIER</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedUser(null)}
                aria-label="Close dossier"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="dossier-hero">
                <div className="dossier-avatar-ring">
                  <div className="dossier-avatar-initials">
                    {selectedUser.fullName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="dossier-hero-info">
                  <h4 className="dossier-name">{selectedUser.fullName}</h4>
                  <div className="dossier-email mono-font">{selectedUser.email}</div>
                  <div className="dossier-badges">
                    <span className={`role-tag ${selectedUser.role === 'admin' ? 'admin' : 'user'}`}>
                      CLEARANCE: {selectedUser.role.toUpperCase()}
                    </span>
                    <span className={`status-pill ${selectedUser.isActive ? 'active' : 'suspended'}`}>
                      {selectedUser.isActive ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="dossier-stats-grid">
                <div className="dossier-stat-box">
                  <span className="dossier-stat-label">Total Searches</span>
                  <span className="dossier-stat-value">{selectedUser.stats?.totalSearches ?? 0}</span>
                </div>
                <div className="dossier-stat-box">
                  <span className="dossier-stat-label">IPs Analyzed</span>
                  <span className="dossier-stat-value">{selectedUser.stats?.ipsAnalyzed ?? 0}</span>
                </div>
              </div>

              {/* Account Meta */}
              <div className="dossier-meta-list">
                <div className="dossier-meta-item">
                  <Calendar size={14} className="dossier-meta-icon" />
                  <span className="dossier-meta-label">Enrolled Date:</span>
                  <span className="dossier-meta-value mono-font">{formatTableDate(selectedUser.createdAt)}</span>
                </div>
                <div className="dossier-meta-item">
                  <Clock size={14} className="dossier-meta-icon" />
                  <span className="dossier-meta-label">Last Session:</span>
                  <span className="dossier-meta-value mono-font">
                    {selectedUser.lastLoginAt ? formatTableDate(selectedUser.lastLoginAt) : 'No recorded logins'}
                  </span>
                </div>
                <div className="dossier-meta-item">
                  <Mail size={14} className="dossier-meta-icon" />
                  <span className="dossier-meta-label">Identifier ID:</span>
                  <span className="dossier-meta-value mono-font">{selectedUser._id}</span>
                </div>
              </div>

              {/* Notice that no credentials or passwords exist here */}
              <div className="dossier-security-notice">
                <ShieldCheck size={14} className="text-gold" />
                <span>Security Protocol: Ciphers and passwords are mathematically hashed with salting and excluded from transmission.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operative Permanent Expulsion Confirmation Modal */}
      {userToDelete && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setUserToDelete(null)}>
          <div className="modal-panel" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <ShieldAlert className="gold-icon" size={20} color="#ef4444" />
                <h3 className="modal-title" style={{ color: '#ef4444' }}>PERMANENT EXPULSION</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#ECEEF2' }}>
              Are you sure you want to permanently erase operative <strong>{userToDelete.fullName}</strong> (<code style={{ color: '#C8A23A' }}>{userToDelete.email}</code>) from the ShadowTrace intelligence database?
              <br /><br />
              <span style={{ color: '#ef4444', fontWeight: '600' }}>
                Warning: This action is permanent. Associated reconnaissance records and session notifications will be purged.
              </span>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                {isDeleting ? 'Expelling...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
