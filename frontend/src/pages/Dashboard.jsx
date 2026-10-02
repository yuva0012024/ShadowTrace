import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Crosshair,
  Globe2,
  Clock,
  ArrowUpRight,
  Eye,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { getDashboardStats } from '../services/api';
import { formatTableDate } from '../utils/formatDate';
import { formatLocation } from '../utils/formatLocation';
import CinematicHeroGlobe from '../components/CinematicHeroGlobe';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await getDashboardStats();
        if (isMounted) {
          setStats(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load intelligence statistics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const recentSearches = stats?.recentActivity || [];

  const handleViewSearch = (search) => {
    const records = search.ipRecords || [];
    if (records.length > 1) {
      navigate(`/multiple-results/${search.searchNumber}`);
    } else {
      navigate(`/results/${search.searchNumber}`);
    }
  };

  return (
    <div className="page-container dashboard-page">
      {error && (
        <div className="alert-error">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Section: Welcome Globe Banner + 2x2 Stats Grid */}
      <div className="dashboard-top-grid">
        {/* Welcome Card with 3D Holographic Earth Globe */}
        <div className="welcome-banner-card">
          <div className="welcome-banner-content">
            <div className="welcome-brand-tagline">TRACE • ANALYZE • REVEAL</div>
            <h1 className="welcome-title">
              WELCOME TO THE <span className="welcome-title-gold">DIGITAL SHADOW</span>
            </h1>
            <p className="welcome-subtitle">Every signal leaves a trace. Follow it.</p>
          </div>
          <CinematicHeroGlobe />
        </div>

        {/* 2x2 Statistics Cards Grid */}
        <div className="dashboard-stats-grid">
          {/* 1. Total Searches */}
          <div className="stat-panel">
            <div className="stat-panel-top">
              <span className="stat-panel-label">Total Searches</span>
              <div className="stat-panel-icon-wrap">
                <KeyRound size={17} />
              </div>
            </div>
            <div className="stat-panel-value">
              {stats?.totalSearches ?? (loading ? '—' : 0)}
            </div>
            <div className="stat-panel-trend positive">
              <ArrowUpRight size={13} />
              <span>Personal Search Archive</span>
            </div>
          </div>

          {/* 2. IPs Analyzed */}
          <div className="stat-panel">
            <div className="stat-panel-top">
              <span className="stat-panel-label">IPs Analyzed</span>
              <div className="stat-panel-icon-wrap">
                <Crosshair size={17} />
              </div>
            </div>
            <div className="stat-panel-value">
              {stats?.ipsAnalyzed ?? (loading ? '—' : 0)}
            </div>
            <div className="stat-panel-trend positive">
              <ArrowUpRight size={13} />
              <span>Isolated Signals</span>
            </div>
          </div>

          {/* 3. Countries Detected */}
          <div className="stat-panel">
            <div className="stat-panel-top">
              <span className="stat-panel-label">Countries Detected</span>
              <div className="stat-panel-icon-wrap">
                <Globe2 size={17} />
              </div>
            </div>
            <div className="stat-panel-value">
              {stats?.countriesDetected ?? (loading ? '—' : 0)}
            </div>
            <div className="stat-panel-trend positive">
              <ArrowUpRight size={13} />
              <span>Active Territories</span>
            </div>
          </div>

          {/* 4. Recent Activity */}
          <div className="stat-panel">
            <div className="stat-panel-top">
              <span className="stat-panel-label">Recent Activity</span>
              <div className="stat-panel-icon-wrap">
                <Clock size={17} />
              </div>
            </div>
            <div className="stat-panel-value">
              {stats?.recentActivity?.length ?? (loading ? '—' : 0)}
            </div>
            <div className="stat-panel-trend neutral">
              <span>Searches recorded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Recent Searches Table */}
      <div className="recent-searches-card">
        <div className="recent-searches-header">
          <h2 className="recent-searches-title">Recent Searches</h2>
          <button
            type="button"
            className="recent-searches-view-all"
            onClick={() => navigate('/history')}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-responsive-wrapper">
          <table className="shadowtrace-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>IP Address</th>
                <th>Location</th>
                <th>ISP</th>
                <th>Time</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell">
                    Loading intelligence records...
                  </td>
                </tr>
              ) : recentSearches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell">
                    No searches recorded yet. Run an analysis to track IP targets.
                  </td>
                </tr>
              ) : (
                recentSearches.map((s, index) => {
                  const firstRecord = s.ipRecords?.[0];
                  const ipDisplay = firstRecord ? firstRecord.ipAddress : 'Not recorded';
                  const moreCount = (s.ipRecords?.length || 0) > 1 ? ` (+${s.ipRecords.length - 1})` : '';
                  const locationDisplay = firstRecord ? formatLocation(firstRecord) : '—';
                  const ispDisplay = firstRecord?.isp || '—';
                  const timeDisplay = formatTableDate(s.searchedAt);

                  return (
                    <tr key={s._id || s.searchNumber || index}>
                      <td className="table-cell-index">{index + 1}</td>
                      <td className="table-cell-ip mono-font">
                        {ipDisplay}{moreCount}
                      </td>
                      <td className="table-cell-location">
                        {locationDisplay}
                      </td>
                      <td className="table-cell-isp">
                        {ispDisplay}
                      </td>
                      <td className="table-cell-time mono-font">
                        {timeDisplay}
                      </td>
                      <td className="table-cell-action">
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handleViewSearch(s)}
                          title="View Intelligence Results"
                        >
                          <Eye size={13} />
                          <span>View</span>
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
  );
}
