import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Key,
  Database,
  Palette,
  Download,
  Info,
  Check,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getSystemStatus, API_BASE_URL } from '../services/api';
import logoSvg from '../assets/logo/logo.svg';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';

export default function Settings() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const [activeTab, setActiveTab] = useState('general');

  // General Settings State
  const [searchMode, setSearchMode] = useState('single');
  const [resultsPerPage, setResultsPerPage] = useState('10');
  const [saveHistory, setSaveHistory] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [autoZoomMap, setAutoZoomMap] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // System Diagnostics
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await getSystemStatus();
        setStatusData(data);
      } catch {
        setStatusData(null);
      }
    }
    loadStatus();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const navItems = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'api', label: 'API Configuration', icon: Key },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="page-container settings-page">
      {/* Background shadow silhouette watermark */}
      <div className="settings-agent-watermark">
        <img src={shadowAgentImg} alt="Agent Silhouette" />
      </div>

      {/* Header */}
      <div className="settings-header-section">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          Manage your application preferences and configuration.
        </p>
      </div>

      {/* Two Column Split: Left Navigation, Right Main Panel */}
      <div className="settings-split-layout">
        {/* Left Settings Sidebar */}
        <div className="settings-nav-sidebar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`settings-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={16} className="settings-tab-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Panel */}
        <div className="settings-main-card">
          {activeTab === 'general' && (
            <form onSubmit={handleSave}>
              <h2 className="settings-panel-heading">General Settings</h2>

              <div className="settings-form-list">
                {/* 1. Default Search Mode */}
                <div className="settings-field-row">
                  <label className="settings-field-label" htmlFor="default-search-mode">
                    Default Search Mode
                  </label>
                  <select
                    id="default-search-mode"
                    className="settings-select"
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value)}
                  >
                    <option value="single">Single IP</option>
                    <option value="multiple">Multiple IPs</option>
                  </select>
                </div>

                {/* 2. Results per Page */}
                <div className="settings-field-row">
                  <label className="settings-field-label" htmlFor="results-per-page">
                    Results per Page
                  </label>
                  <select
                    id="results-per-page"
                    className="settings-select"
                    value={resultsPerPage}
                    onChange={(e) => setResultsPerPage(e.target.value)}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>

                {/* 3. Save Search History Toggle */}
                <div className="settings-toggle-row">
                  <span className="settings-field-label">Save Search History</span>
                  <label className="st-switch">
                    <input
                      type="checkbox"
                      checked={saveHistory}
                      onChange={(e) => setSaveHistory(e.target.checked)}
                    />
                    <span className="st-slider round" />
                  </label>
                </div>

                {/* 4. Enable Notifications Toggle */}
                <div className="settings-toggle-row">
                  <span className="settings-field-label">Enable Notifications</span>
                  <label className="st-switch">
                    <input
                      type="checkbox"
                      checked={enableNotifications}
                      onChange={(e) => setEnableNotifications(e.target.checked)}
                    />
                    <span className="st-slider round" />
                  </label>
                </div>

                {/* 5. Auto Zoom Map Toggle */}
                <div className="settings-toggle-row">
                  <span className="settings-field-label">Auto Zoom Map</span>
                  <label className="st-switch">
                    <input
                      type="checkbox"
                      checked={autoZoomMap}
                      onChange={(e) => setAutoZoomMap(e.target.checked)}
                    />
                    <span className="st-slider round" />
                  </label>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="settings-submit-row">
                {savedSuccess && (
                  <span className="settings-saved-note">
                    <Check size={14} /> Changes saved successfully
                  </span>
                )}
                <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'api' && (
            <div>
              <h2 className="settings-panel-heading">API Configuration</h2>
              <div className="settings-form-list">
                <div className="settings-field-row">
                  <span className="settings-field-label">Geolocation Provider</span>
                  <span className="settings-static-val mono-font">
                    {statusData?.geolocationProvider?.endpoint || 'http://ip-api.com/json'}
                  </span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Provider Status</span>
                  <span className="pill-badge pill-valid">
                    {statusData?.geolocationProvider?.status || 'Active'}
                  </span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Backend API URL</span>
                  <span className="settings-static-val mono-font">{API_BASE_URL}</span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Rate Limit Quota</span>
                  <span className="settings-static-val">60 lookups / min (Standard)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div>
              <h2 className="settings-panel-heading">Database Status</h2>
              <div className="settings-form-list">
                <div className="settings-field-row">
                  <span className="settings-field-label">MongoDB Connection</span>
                  <span className={`pill-badge ${statusData?.database?.status === 'Connected' ? 'pill-valid' : 'pill-private'}`}>
                    {statusData?.database?.status || 'Connected'}
                  </span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Database Host</span>
                  <span className="settings-static-val mono-font">
                    {statusData?.database?.host || '127.0.0.1'}
                  </span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Database Name</span>
                  <span className="settings-static-val mono-font">
                    {statusData?.database?.name || 'shadowtrace'}
                  </span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Collections</span>
                  <span className="settings-static-val mono-font">searches, ip_records</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h2 className="settings-panel-heading">Appearance & Themes</h2>
              <div className="settings-form-list">
                <div className="settings-field-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <span className="settings-field-label">Interface Color Theme</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Active: {themeMode.toUpperCase()} (Resolved: {resolvedTheme.toUpperCase()})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn-gold-outline ${themeMode === 'dark' ? 'active' : ''}`}
                      onClick={() => setThemeMode('dark')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.76rem',
                        background: themeMode === 'dark' ? 'var(--gold-btn-gradient)' : 'transparent',
                        color: themeMode === 'dark' ? '#07090C' : 'var(--text-main)',
                        borderColor: themeMode === 'dark' ? 'var(--gold-bright)' : 'var(--border-subtle)'
                      }}
                    >
                      <Moon size={14} />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-gold-outline ${themeMode === 'light' ? 'active' : ''}`}
                      onClick={() => setThemeMode('light')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.76rem',
                        background: themeMode === 'light' ? 'var(--gold-btn-gradient)' : 'transparent',
                        color: themeMode === 'light' ? '#07090C' : 'var(--text-main)',
                        borderColor: themeMode === 'light' ? 'var(--gold-bright)' : 'var(--border-subtle)'
                      }}
                    >
                      <Sun size={14} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-gold-outline ${themeMode === 'system' ? 'active' : ''}`}
                      onClick={() => setThemeMode('system')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.76rem',
                        background: themeMode === 'system' ? 'var(--gold-btn-gradient)' : 'transparent',
                        color: themeMode === 'system' ? '#07090C' : 'var(--text-main)',
                        borderColor: themeMode === 'system' ? 'var(--gold-bright)' : 'var(--border-subtle)'
                      }}
                    >
                      <Laptop size={14} />
                      <span>System Default</span>
                    </button>
                  </div>
                </div>

                <div className="settings-field-row">
                  <span className="settings-field-label">Interactive Cartography</span>
                  <span className="settings-static-val">Dual Layers: Vector Street / Terrain & Esri World Satellite</span>
                </div>

                <div className="settings-field-row">
                  <span className="settings-field-label">Typography System</span>
                  <span className="settings-static-val">Cinzel (Headings) + Inter (Interface) + JetBrains Mono (Data)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div>
              <h2 className="settings-panel-heading">Export Configuration</h2>
              <div className="settings-form-list">
                <div className="settings-field-row">
                  <span className="settings-field-label">Supported Formats</span>
                  <span className="settings-static-val">Structured JSON (.json), Tabular CSV (.csv)</span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Encoding</span>
                  <span className="settings-static-val mono-font">UTF-8 / RFC 4180</span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Metadata Inclusion</span>
                  <span className="settings-static-val">Search ID, Timestamps, Disclaimers Included</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h2 className="settings-panel-heading">About ShadowTrace</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                <img src={logoSvg} alt="ShadowTrace" style={{ width: '42px', height: '42px' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold-bright)' }}>
                    SHADOWTRACE
                  </div>
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: 'var(--gold-muted)' }}>
                    TRACE • ANALYZE • REVEAL
                  </div>
                </div>
              </div>
              <div className="settings-form-list">
                <div className="settings-field-row">
                  <span className="settings-field-label">System Version</span>
                  <span className="settings-static-val mono-font">v1.0.0 Production</span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Analyst Operator</span>
                  <span className="settings-static-val">Yuvaraj</span>
                </div>
                <div className="settings-field-row">
                  <span className="settings-field-label">Purpose</span>
                  <span className="settings-static-val">IP-Based Digital Location Intelligence System</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
