import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Search,
  Crosshair,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Activity,
  Eye,
  RefreshCw
} from 'lucide-react';
import { getAdminStats } from '../services/api';
import { formatTableDate } from '../utils/formatDate';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await getAdminStats();
      if (res.success && res.data) {
        setStats(res.data);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to retrieve administrative statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const recentUsers = stats?.recentUsers || [];
  const recentSearches = stats?.recentSearches || [];

  const handleViewSearch = (search) => {
    const records = search.ipRecords || [];
    if (records.length > 1) {
      navigate(`/multiple-results/${search.searchNumber}`);
    } else {
      navigate(`/results/${search.searchNumber}`);
    }
  };

  return (
    <div className="page-container admin-dashboard-page">
      {error && (
        <div className="alert-error">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="admin-banner-card">
        <div className="admin-banner-content">
          <div className="admin-banner-badge">
            <ShieldCheck size={14} />
            <span>SECURITY LEVEL: ROOT CLEARANCE</span>
          </div>
          <h1 className="admin-banner-title">ADMINISTRATIVE COMMAND</h1>
          <p className="admin-banner-subtitle">
            System-wide reconnaissance metrics, registered operatives, and analytical data streams.
          </p>
        </div>
        <div className="admin-banner-actions">
          <button
            type="button"
            className="btn-gold-outline"
            onClick={() => fetchStats(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Intel'}</span>
          </button>
          <Link to="/admin/users" className="btn-primary">
            <Users size={15} />
            <span>Manage Operatives</span>
          </Link>
        </div>
      </div>

      {/* 4 Core Admin Stat Panels */}
      <div className="admin-stats-grid">
        {/* Total Users */}
        <div className="stat-panel">
          <div className="stat-panel-top">
            <span className="stat-panel-label">Total Operatives</span>
            <div className="stat-panel-icon-wrap">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-panel-value">
            {stats?.totalUsers ?? (loading ? '—' : 0)}
          </div>
          <div className="stat-panel-trend positive">
            <span>Registered accounts in database</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="stat-panel">
          <div className="stat-panel-top">
            <span className="stat-panel-label">Active Clearances</span>
            <div className="stat-panel-icon-wrap">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-panel-value">
            {stats?.activeUsers ?? (loading ? '—' : 0)}
          </div>
          <div className="stat-panel-trend positive">
            <span>Operatives with active status</span>
          </div>
        </div>

        {/* Total Searches */}
        <div className="stat-panel">
          <div className="stat-panel-top">
            <span className="stat-panel-label">Global Searches</span>
            <div className="stat-panel-icon-wrap">
              <Search size={18} />
            </div>
          </div>
          <div className="stat-panel-value">
            {stats?.totalSearches ?? (loading ? '—' : 0)}
          </div>
          <div className="stat-panel-trend neutral">
            <span>Aggregated system operations</span>
          </div>
        </div>

        {/* Total IPs Analyzed */}
        <div className="stat-panel">
          <div className="stat-panel-top">
            <span className="stat-panel-label">Total IPs Analyzed</span>
            <div className="stat-panel-icon-wrap">
              <Crosshair size={18} />
            </div>
          </div>
          <div className="stat-panel-value">
            {stats?.totalIpsAnalyzed ?? (loading ? '—' : 0)}
          </div>
          <div className="stat-panel-trend positive">
            <span>Unique reconnaissance records</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Operatives & Recent System Searches */}
      <div className="admin-double-grid">
        {/* Recent Operatives Table */}
        <div className="recent-searches-card">
          <div className="recent-searches-header">
            <div className="card-header-with-icon">
              <Users size={18} className="gold-icon" />
              <h2 className="recent-searches-title">Recently Enrolled Operatives</h2>
            </div>
            <Link to="/admin/users" className="recent-searches-view-all">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive-wrapper">
            <table className="shadowtrace-table">
              <thead>
                <tr>
                  <th>Operative</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="table-empty-cell">
                      Loading operative records...
                    </td>
                  </tr>
                ) : recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty-cell">
                      No registered users found.
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="table-cell-name">
                        <div className="user-name-display">{u.fullName}</div>
                        <div className="user-email-display">{u.email}</div>
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
                      <td className="table-cell-time mono-font">
                        {formatTableDate(u.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Recent Searches Table */}
        <div className="recent-searches-card">
          <div className="recent-searches-header">
            <div className="card-header-with-icon">
              <Activity size={18} className="gold-icon" />
              <h2 className="recent-searches-title">Live Global Search Activity</h2>
            </div>
            <Link to="/history" className="recent-searches-view-all">
              <span>Browse Archive</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive-wrapper">
            <table className="shadowtrace-table">
              <thead>
                <tr>
                  <th>Search ID</th>
                  <th>Operative</th>
                  <th>IP Target</th>
                  <th>Time</th>
                  <th style={{ textAlign: 'center' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="table-empty-cell">
                      Loading global searches...
                    </td>
                  </tr>
                ) : recentSearches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty-cell">
                      No search operations recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentSearches.map((s) => {
                    const firstRecord = s.ipRecords?.[0];
                    const ipDisplay = firstRecord ? firstRecord.ipAddress : '—';
                    const moreCount = (s.ipRecords?.length || 0) > 1 ? ` (+${s.ipRecords.length - 1})` : '';

                    return (
                      <tr key={s._id}>
                        <td className="mono-font table-cell-gold">
                          {s.searchNumber}
                        </td>
                        <td>
                          {s.user ? (
                            <span className="user-name-snippet" title={s.user.email}>
                              {s.user.fullName}
                            </span>
                          ) : (
                            <span className="text-muted">Legacy Intel</span>
                          )}
                        </td>
                        <td className="mono-font">
                          {ipDisplay}{moreCount}
                        </td>
                        <td className="mono-font table-cell-time">
                          {formatTableDate(s.searchedAt)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => handleViewSearch(s)}
                            title="Inspect Reconnaissance Record"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
