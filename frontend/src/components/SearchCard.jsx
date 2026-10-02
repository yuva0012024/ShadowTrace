import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchCard() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/history?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="st-card" style={{ marginBottom: '24px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-muted)' }} />
          <input
            type="text"
            className="st-input"
            style={{ paddingLeft: '44px' }}
            placeholder="Search archive by Search Number (ST-000001), IP address, or Country..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary" style={{ height: '48px', padding: '0 20px' }}>
          <span>Search Archive</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
