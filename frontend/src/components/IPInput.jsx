import React, { useState } from 'react';
import { Search, ListPlus, AlertCircle, Sparkles } from 'lucide-react';

export default function IPInput({ onAnalyzeSingle, onAnalyzeMultiple, loading }) {
  const [activeTab, setActiveTab] = useState('single');
  const [singleIp, setSingleIp] = useState('');
  const [multipleIps, setMultipleIps] = useState('');
  const [validationError, setValidationError] = useState('');

  const sampleIps = [
    { label: 'Google DNS', ip: '8.8.8.8' },
    { label: 'Cloudflare', ip: '1.1.1.1' },
    { label: 'Cisco Umbrella', ip: '208.67.222.222' },
    { label: 'Quad9 DNS', ip: '9.9.9.9' }
  ];

  const handleSingleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    const trimmed = singleIp.trim();
    if (!trimmed) {
      setValidationError('Please enter a valid IP address to trace.');
      return;
    }
    onAnalyzeSingle(trimmed);
  };

  const handleMultipleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    const rawLines = multipleIps
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      setValidationError('Please enter at least one IP address.');
      return;
    }

    onAnalyzeMultiple(rawLines);
  };

  const populateSampleSingle = (ip) => {
    setSingleIp(ip);
    setValidationError('');
  };

  const populateSampleMultiple = () => {
    setMultipleIps('8.8.8.8\n1.1.1.1\n208.67.222.222\n9.9.9.9');
    setValidationError('');
  };

  return (
    <div className="st-card">
      <div className="st-tabs">
        <button
          type="button"
          className={`st-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => { setActiveTab('single'); setValidationError(''); }}
        >
          Single IP Analysis
        </button>
        <button
          type="button"
          className={`st-tab-btn ${activeTab === 'multiple' ? 'active' : ''}`}
          onClick={() => { setActiveTab('multiple'); setValidationError(''); }}
        >
          Multiple IP Analysis
        </button>
      </div>

      {validationError && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {activeTab === 'single' ? (
        <form onSubmit={handleSingleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="single-ip-input">
              Target IP Address (IPv4 or IPv6)
            </label>
            <input
              id="single-ip-input"
              type="text"
              className="st-input"
              placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
              value={singleIp}
              onChange={(e) => setSingleIp(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} color="var(--gold-primary)" /> Quick Targets:
            </span>
            {sampleIps.map((s) => (
              <button
                key={s.ip}
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => populateSampleSingle(s.ip)}
                disabled={loading}
              >
                {s.label} ({s.ip})
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            id="btn-analyze-single"
          >
            <Search size={18} />
            {loading ? 'Tracing Target...' : 'Analyze IP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMultipleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="multiple-ip-textarea">
              Batch IP Addresses (One per line or comma-separated)
            </label>
            <textarea
              id="multiple-ip-textarea"
              className="st-textarea"
              placeholder="8.8.8.8&#10;1.1.1.1&#10;208.67.222.222&#10;9.9.9.9"
              value={multipleIps}
              onChange={(e) => setMultipleIps(e.target.value)}
              disabled={loading}
              rows={6}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={populateSampleMultiple}
              disabled={loading}
            >
              <Sparkles size={14} color="var(--gold-primary)" /> Load Multi-Target Sample Preset
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            id="btn-analyze-multiple"
          >
            <ListPlus size={18} />
            {loading ? 'Batch Resolving...' : 'Analyze Multiple IPs'}
          </button>
        </form>
      )}
    </div>
  );
}
