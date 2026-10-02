import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function IPTable({ records = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.ipAddress && r.ipAddress.toLowerCase().includes(term)) ||
      (r.hostname && r.hostname.toLowerCase().includes(term)) ||
      (r.country && r.country.toLowerCase().includes(term)) ||
      (r.city && r.city.toLowerCase().includes(term)) ||
      (r.isp && r.isp.toLowerCase().includes(term)) ||
      (r.organization && r.organization.toLowerCase().includes(term))
    );
  });

  return (
    <div className="st-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Target Records Matrix</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Displaying {filteredRecords.length} of {records.length} resolved records
          </span>
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="st-input"
            style={{ paddingLeft: '36px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.85rem' }}
            placeholder="Filter IPs, countries, ISPs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="st-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Hostname</th>
              <th>Country</th>
              <th>State / Region</th>
              <th>District</th>
              <th>City</th>
              <th>ISP</th>
              <th>ASN</th>
              <th>Timezone</th>
              <th>Organization</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No matching IP records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => (
                <tr key={`${r.ipAddress}-${idx}`}>
                  <td className="mono-text" style={{ fontWeight: 600, color: 'var(--gold-light)' }}>
                    {r.ipAddress}
                  </td>
                  <td className="mono-text" style={{ fontSize: '0.82rem' }}>
                    {r.hostname || 'Not available'}
                  </td>
                  <td>{r.country || 'Not available'}</td>
                  <td>{r.region || 'Not available'}</td>
                  <td>{r.district || 'Not available'}</td>
                  <td>{r.city || 'Not available'}</td>
                  <td>{r.isp || 'Not available'}</td>
                  <td className="mono-text" style={{ fontSize: '0.8rem' }}>
                    {r.asn || 'Not available'}
                  </td>
                  <td>{r.timezone || 'Not available'}</td>
                  <td>{r.organization || 'Not available'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
