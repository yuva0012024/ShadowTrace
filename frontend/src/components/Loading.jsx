import React from 'react';

export default function Loading({ message = 'Analyzing IP address...' }) {
  return (
    <div className="loading-box">
      <div className="radar-spinner"></div>
      <div className="loading-text">{message}</div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
        Querying routing tables, autonomous system records, and approximate geo coordinates...
      </p>
    </div>
  );
}
