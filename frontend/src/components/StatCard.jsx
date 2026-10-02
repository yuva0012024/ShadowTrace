import React from 'react';

export default function StatCard({ label, value, icon: Icon, subtext }) {
  return (
    <div className="st-card stat-card">
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value !== undefined && value !== null ? value : '—'}</span>
        {subtext && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {subtext}
          </span>
        )}
      </div>
      {Icon && (
        <div className="stat-icon-wrapper">
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}
