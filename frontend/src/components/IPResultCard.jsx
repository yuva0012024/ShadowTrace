import React from 'react';
import { getCountryFlag } from '../utils/formatLocation';

export default function IPResultCard({ record, _searchNumber }) {
  if (!record) return null;

  const isPrivate = record.isPrivate || record.country === 'Private / Reserved';

  const rows = [
    { label: 'Country', value: record.country, isCountry: true },
    { label: 'Region', value: record.region },
    { label: 'District', value: record.district },
    { label: 'City', value: record.city },
    { label: 'Latitude', value: record.latitude !== null && record.latitude !== undefined ? Number(record.latitude).toFixed(4) : 'Not available', isMono: true },
    { label: 'Longitude', value: record.longitude !== null && record.longitude !== undefined ? Number(record.longitude).toFixed(4) : 'Not available', isMono: true },
    { label: 'ISP', value: record.isp },
    { label: 'ASN', value: record.asn, isMono: true },
    { label: 'Timezone', value: record.timezone },
    { label: 'Hostname', value: record.hostname, isMono: true },
    { label: 'Organization', value: record.organization }
  ];

  return (
    <div className="ip-info-card">
      {/* Card Header */}
      <div className="ip-info-header">
        <div className="ip-info-title-wrap">
          <span className="ip-info-label">IP Address</span>
          <h2 className="ip-info-address mono-font">{record.ipAddress}</h2>
        </div>

        <div className="ip-info-status-badge">
          {isPrivate ? (
            <span className="pill-badge pill-private">Private IP</span>
          ) : (
            <span className="pill-badge pill-valid">Valid IP</span>
          )}
        </div>
      </div>

      {/* Key-Value Properties Table */}
      <div className="ip-props-list">
        {rows.map((row, idx) => {
          const displayVal = row.value || 'Not available';
          const flag = row.isCountry ? getCountryFlag(record.country) : null;

          return (
            <div key={idx} className="ip-prop-row">
              <span className="ip-prop-label">{row.label}</span>
              <span className={`ip-prop-value ${row.isMono ? 'mono-font' : ''}`}>
                {flag && <span className="ip-prop-flag">{flag}</span>}
                <span>{displayVal}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
