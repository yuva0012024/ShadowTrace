import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  PlusCircle,
  ExternalLink,
  AlertCircle,
  Loader2,
  Globe2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Layers
} from 'lucide-react';
import MapView from '../components/MapView';
import { getSearchById } from '../services/api';
import { getCountryFlag } from '../utils/formatLocation';

export default function MultipleResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBatch() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getSearchById(id);
        if (isMounted) {
          if (res.data) {
            setSearchData(res.data);
            setError(null);
          } else {
            setError(`Search batch "${id}" not found.`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Failed to retrieve batch records.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBatch();
    return () => { isMounted = false; };
  }, [id]);

  const records = useMemo(() => searchData?.ipRecords || [], [searchData]);

  // Summary statistics calculated strictly from real database records (no fake data)
  const summary = useMemo(() => {
    const total = records.length;
    const privateCount = records.filter(
      (r) => r.isPrivate || r.country === 'Private / Reserved' || r.isp === 'Private Network'
    ).length;
    const validCount = total;
    const publicCount = total - privateCount;

    const distinctCountries = new Set(
      records
        .map((r) => r.country)
        .filter((c) => c && c !== 'Not available' && c !== 'Private / Reserved')
    );

    const distinctRegions = new Set(
      records
        .map((r) => r.region)
        .filter((reg) => reg && reg !== 'Not available' && reg !== 'Local Network')
    );

    const distinctCities = new Set(
      records
        .map((r) => r.city)
        .filter((city) => city && city !== 'Not available' && city !== 'Internal Range')
    );

    return {
      total,
      valid: validCount,
      private: privateCount,
      public: publicCount,
      countries: distinctCountries.size,
      regions: distinctRegions.size,
      cities: distinctCities.size
    };
  }, [records]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state-card">
          <Loader2 size={32} className="spin-animation" color="var(--gold-primary)" />
          <span>Resolving batch dossier for {id}...</span>
        </div>
      </div>
    );
  }

  if (error || !searchData) {
    return (
      <div className="page-container">
        <button
          className="btn-secondary"
          onClick={() => navigate('/history')}
          style={{ marginBottom: '20px' }}
        >
          Back to Search History
        </button>
        <div className="alert-error">
          <AlertCircle size={20} />
          <span>{error || 'Batch intelligence session not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container multiple-results-page">
      {/* Top Header & Action Buttons */}
      <div className="multiple-header-section">
        <div>
          <h1 className="multiple-title">Multiple IP Analysis</h1>
          <p className="multiple-subtitle">
            {records.length} {records.length === 1 ? 'IP address' : 'IP addresses'} analyzed
          </p>
        </div>

        <div className="multiple-header-actions">
          <button
            type="button"
            className="btn-gold-outline"
            onClick={() => navigate('/export')}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/analyze')}
          >
            <PlusCircle size={14} />
            <span>New Search</span>
          </button>
        </div>
      </div>

      {/* Upper Table: Multiple IPs Table */}
      <div className="multiple-table-card">
        <div className="table-responsive-wrapper">
          <table className="shadowtrace-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>IP Address</th>
                <th>Country</th>
                <th>Region</th>
                <th>City</th>
                <th>ISP</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const isPriv = r.isPrivate || r.country === 'Private / Reserved' || r.isp === 'Private Network';
                const flag = getCountryFlag(r.country);

                return (
                  <tr key={`${r.ipAddress}-${idx}`}>
                    <td className="table-cell-index">{idx + 1}</td>
                    <td className="table-cell-ip mono-font">{r.ipAddress}</td>
                    <td className="table-cell-country">
                      <span className="country-cell-inner">
                        <span className="country-flag-icon">{flag}</span>
                        <span>{r.country || 'Not available'}</span>
                      </span>
                    </td>
                    <td className="table-cell-region">{r.region || '—'}</td>
                    <td className="table-cell-city">{r.city || '—'}</td>
                    <td className="table-cell-isp">{r.isp || '—'}</td>
                    <td className="table-cell-status" style={{ textAlign: 'center' }}>
                      {isPriv ? (
                        <span className="status-pill status-pill-private">Private</span>
                      ) : (
                        <span className="status-pill status-pill-success">Success</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Section: Split Map and Analysis Summary */}
      <div className="multiple-lower-grid">
        {/* Left: Interactive World Map with Legend */}
        <div className="multiple-map-container">
          <MapView
            records={records}
            height={360}
            showNotice={false}
            usePins={true}
          />

          {/* Map Legend */}
          <div className="map-legend-bar">
            <div className="legend-item">
              <span className="legend-dot dot-public" />
              <span>Public IP</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-private" />
              <span>Private IP</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-marker" />
              <span>Location Marker</span>
            </div>
          </div>
        </div>

        {/* Right: Analysis Summary Card */}
        <div className="analysis-summary-card">
          <h2 className="summary-card-title">Analysis Summary</h2>
          <div className="summary-metrics-list">
            <div className="summary-metric-item">
              <div className="metric-icon-label">
                <Layers size={15} className="metric-icon" />
                <span>Total IPs</span>
              </div>
              <span className="metric-value mono-font">{summary.total}</span>
            </div>

            <div className="summary-metric-item">
              <div className="metric-icon-label">
                <CheckCircle2 size={15} className="metric-icon" />
                <span>Valid IPs</span>
              </div>
              <span className="metric-value mono-font">{summary.valid}</span>
            </div>

            <div className="summary-metric-item">
              <div className="metric-icon-label">
                <ShieldCheck size={15} className="metric-icon" />
                <span>Private IPs</span>
              </div>
              <span className="metric-value mono-font">{summary.private}</span>
            </div>

            <div className="summary-metric-item">
              <div className="metric-icon-label">
                <Globe2 size={15} className="metric-icon" />
                <span>Public Nodes</span>
              </div>
              <span className="metric-value mono-font">{summary.public}</span>
            </div>

            <div className="summary-metric-item">
              <div className="metric-icon-label">
                <MapPin size={15} className="metric-icon" />
                <span>Regions</span>
              </div>
              <span className="metric-value mono-font">{summary.regions}</span>
            </div>

            <div className="summary-metric-item">
              <div className="metric-icon-label">
                <Building2 size={15} className="metric-icon" />
                <span>Cities</span>
              </div>
              <span className="metric-value mono-font">{summary.cities}</span>
            </div>
          </div>

          <div className="summary-card-footer">
            <button
              type="button"
              className="summary-view-map-link"
              onClick={() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
            >
              <span>View Map</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
