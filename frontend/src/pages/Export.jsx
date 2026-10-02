import React, { useEffect, useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { getHistory, exportSearch } from '../services/api';
import { formatDate } from '../utils/formatDate';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';

export default function Export() {
  const [searches, setSearches] = useState([]);
  const [selectedSearchId, setSelectedSearchId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');
  const [exportError, setExportError] = useState('');
  const [networkError, setNetworkError] = useState('');

  useEffect(() => {
    async function loadSearches() {
      try {
        setLoadingList(true);
        setExportError('');
        setNetworkError('');
        const res = await getHistory('', 1, 100);
        const list = Array.isArray(res?.searches) ? res.searches : (Array.isArray(res) ? res : []);
        setSearches(list);
        if (list.length > 0) {
          setSelectedSearchId(list[0].searchNumber || list[0]._id || list[0].id);
        }
      } catch (err) {
        setNetworkError(err.response?.data?.error || err.message || 'Unable to connect to backend service.');
      } finally {
        setLoadingList(false);
      }
    }
    loadSearches();
  }, []);

  const selectedSearch = searches.find(
    (s) => s.searchNumber === selectedSearchId || s._id === selectedSearchId || s.id === selectedSearchId
  );

  const handleDownload = async (format) => {
    if (!selectedSearchId) return;
    setExporting(true);
    setExportSuccess('');
    setExportError('');

    try {
      await exportSearch(selectedSearchId, format);
      setExportSuccess(`Successfully generated and downloaded ${selectedSearchId}.${format} directly from database.`);
    } catch (err) {
      setExportError(err.response?.data?.error || err.message || 'Export generation failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-container export-page">
      {/* Background shadow silhouette watermark */}
      <div className="export-agent-watermark">
        <img src={shadowAgentImg} alt="Agent Silhouette" />
      </div>

      {/* Header */}
      <div className="export-header-section">
        <div className="export-category-tag">INTELLIGENCE DATA EXPORT</div>
        <h1 className="export-title">EXPORT INTELLIGENCE DOSSIERS</h1>
        <p className="export-subtitle">
          Extract authenticated reconnaissance records from MongoDB in structured CSV or JSON formats.
        </p>
      </div>

      {exportSuccess && (
        <div className="alert-success">
          <CheckCircle size={18} />
          <span>{exportSuccess}</span>
        </div>
      )}

      {exportError && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{exportError}</span>
        </div>
      )}

      {networkError && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{networkError}</span>
        </div>
      )}

      <div className="export-grid-layout">
        {/* Section 1: Select Analysis Session */}
        <div className="export-card">
          <h2 className="export-section-title">1. SELECT ANALYSIS SESSION</h2>

          {loadingList ? (
            <div className="export-loading-state">
              <Loader2 size={20} className="spin-animation" color="var(--gold-primary)" />
              <span>Retrieving archived sessions from MongoDB...</span>
            </div>
          ) : searches.length === 0 ? (
            <div className="export-empty-state">
              <Database size={24} color="var(--gold-muted)" />
              <p>No recorded searches available to export.</p>
            </div>
          ) : (
            <div className="export-input-group">
              <label className="export-input-label" htmlFor="select-session">
                Archived Search Number
              </label>
              <select
                id="select-session"
                className="export-select-input mono-font"
                value={selectedSearchId}
                onChange={(e) => setSelectedSearchId(e.target.value)}
              >
                {searches.map((s) => {
                  const sVal = s.searchNumber || s._id || s.id;
                  const ipCount = s.ipRecords?.length || s.ipCount || 0;
                  return (
                    <option key={sVal} value={sVal}>
                      {s.searchNumber} — {formatDate(s.searchedAt)} ({ipCount} {ipCount === 1 ? 'IP' : 'IPs'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Session Summary Details */}
          {selectedSearch && (
            <div className="export-session-metadata-box">
              <div className="export-metadata-badge">Session Metadata</div>
              <div className="export-metadata-row">
                <span className="export-meta-label">Search Number:</span>
                <span className="export-meta-val mono-font" style={{ color: 'var(--gold-bright)' }}>
                  {selectedSearch.searchNumber}
                </span>
              </div>
              <div className="export-metadata-row">
                <span className="export-meta-label">Logged At:</span>
                <span className="export-meta-val mono-font">
                  {formatDate(selectedSearch.searchedAt)}
                </span>
              </div>
              <div className="export-metadata-row">
                <span className="export-meta-label">Total Target Nodes:</span>
                <span className="export-meta-val">
                  {selectedSearch.ipRecords?.length ?? selectedSearch.ipCount ?? 0}
                </span>
              </div>
              <div className="export-metadata-row">
                <span className="export-meta-label">Target IPs:</span>
                <span className="export-meta-val mono-font" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {(selectedSearch.ipRecords || []).map((r) => r.ipAddress).filter(Boolean).slice(0, 4).join(', ') || 'Archived intelligence nodes'}
                  {(selectedSearch.ipRecords?.length || 0) > 4 ? '...' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Choose Export Format */}
        <div className="export-card">
          <h2 className="export-section-title">2. CHOOSE EXPORT FORMAT</h2>
          <p className="export-format-intro">
            Data is exported with genuine timestamps, network parameters, and geolocation metrics.
          </p>

          <div className="export-formats-stack">
            {/* JSON Option */}
            <div className="export-format-item">
              <div className="export-format-icon-text">
                <FileJson size={32} color="var(--gold-primary)" />
                <div>
                  <div className="export-format-name">Structured JSON</div>
                  <div className="export-format-desc">
                    Machine-readable schema with nested metadata and disclaimer
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary export-action-btn"
                onClick={() => handleDownload('json')}
                disabled={exporting || !selectedSearchId}
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            </div>

            {/* CSV Option */}
            <div className="export-format-item">
              <div className="export-format-icon-text">
                <FileSpreadsheet size={32} color="var(--gold-primary)" />
                <div>
                  <div className="export-format-name">Tabular CSV</div>
                  <div className="export-format-desc">
                    Standard spreadsheet compatible with Excel, Sheets, and SIEM tools
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary export-action-btn"
                onClick={() => handleDownload('csv')}
                disabled={exporting || !selectedSearchId}
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
