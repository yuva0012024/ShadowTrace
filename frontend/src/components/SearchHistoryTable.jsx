import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export default function SearchHistoryTable({ searches = [], loading = false }) {
  const navigate = useNavigate();

  const handleView = (search) => {
    const recordCount = search.ipRecords ? search.ipRecords.length : 0;
    if (recordCount > 1) {
      navigate(`/multiple-results/${search.searchNumber}`);
    } else {
      navigate(`/results/${search.searchNumber}`);
    }
  };

  if (loading) {
    return (
      <div className="st-card" style={{ textAlign: 'center', padding: '40px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading intelligence history records...</span>
      </div>
    );
  }

  if (!searches || searches.length === 0) {
    return (
      <div className="st-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '12px' }}>
          No searches have been recorded yet.
        </p>
        <button
          className="btn-primary"
          onClick={() => navigate('/analyze')}
        >
          Initiate First IP Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="st-table">
        <thead>
          <tr>
            <th>Search Number</th>
            <th>Date & Time</th>
            <th>IPs Analyzed</th>
            <th>Target Countries</th>
            <th>Sample IP</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {searches.map((s) => {
            const records = s.ipRecords || [];
            const ipCount = records.length;
            const countries = [
              ...new Set(
                records
                  .map((r) => r.country)
                  .filter((c) => c && c !== 'Not available' && c !== 'Private / Reserved')
              )
            ];
            const sampleIp = records.length > 0 ? records[0].ipAddress : '—';

            return (
              <tr key={s._id || s.searchNumber}>
                <td>
                  <span className="search-number-badge">{s.searchNumber}</span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="var(--gold-muted)" />
                    <span>{formatDate(s.searchedAt)}</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {ipCount} {ipCount === 1 ? 'address' : 'addresses'}
                  </span>
                </td>
                <td>
                  {countries.length > 0 ? (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {countries.slice(0, 3).join(', ')}
                      {countries.length > 3 ? ` +${countries.length - 3}` : ''}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not available</span>
                  )}
                </td>
                <td className="mono-text" style={{ fontSize: '0.85rem' }}>
                  {sampleIp} {ipCount > 1 ? `(+${ipCount - 1} more)` : ''}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn-gold-outline"
                    onClick={() => handleView(s)}
                    title="Inspect Search Intelligence Dossier"
                  >
                    <Eye size={14} />
                    <span>View Results</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
