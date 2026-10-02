import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Network,
  History,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useIPAnalysis } from '../hooks/useIPAnalysis';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';

export default function Analyze() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialIp = searchParams.get('ip') || '';

  const [inputVal, setInputVal] = useState(initialIp);
  const [validationError, setValidationError] = useState('');
  const { loading, error, runSingleAnalysis, runMultipleAnalysis } = useIPAnalysis();

  // If initial IP passed in query params, auto-fill
  useEffect(() => {
    if (initialIp) {
      setInputVal(initialIp);
    }
  }, [initialIp]);

  const handleAnalyze = async (rawInput) => {
    setValidationError('');
    const trimmed = (rawInput || inputVal).trim();

    if (!trimmed) {
      setValidationError('Please enter an IP address to analyze.');
      return;
    }

    // Split by comma, newline, semicolon, or space
    const ipList = trimmed
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (ipList.length === 0) {
      setValidationError('Please enter a valid IP address.');
      return;
    }

    try {
      if (ipList.length === 1) {
        const response = await runSingleAnalysis(ipList[0]);
        const searchNum = response.searchNumber || response.searchId;
        navigate(`/results/${searchNum}`);
      } else {
        const response = await runMultipleAnalysis(ipList);
        const searchNum = response.searchNumber || response.searchId;
        navigate(`/multiple-results/${searchNum}`);
      }
    } catch {
      // Error handled by hook
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleAnalyze();
  };

  const handleChipClick = (ip) => {
    setInputVal(ip);
    setValidationError('');
    handleAnalyze(ip);
  };

  const handleQuickAction = (action) => {
    if (action === 'single') {
      setInputVal('8.8.8.8');
      setValidationError('');
    } else if (action === 'multiple') {
      setInputVal('8.8.8.8, 1.1.1.1, 9.9.9.9, 103.21.244.1');
      setValidationError('');
    } else if (action === 'history') {
      navigate('/history');
    } else if (action === 'export') {
      navigate('/export');
    }
  };

  return (
    <div className="page-container analyze-page">
      {/* Background shadow silhouette watermark */}
      <div className="analyze-agent-silhouette">
        <img src={shadowAgentImg} alt="Agent Silhouette" />
      </div>

      {/* Page Title & Subtitle */}
      <div className="analyze-header-section">
        <h1 className="analyze-title">Analyze IP Address</h1>
        <p className="analyze-subtitle">
          Enter one or more IP addresses to get detailed geolocation and network information.
        </p>
      </div>

      {/* Main Analysis Input Box */}
      <div className="analyze-panel-card">
        <form onSubmit={handleFormSubmit} className="analyze-form">
          <div className="analyze-input-group">
            <input
              type="text"
              className="analyze-main-input"
              placeholder="Enter IP address (e.g. 8.8.8.8 or multiple IPs separated by commas)"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="btn-analyze-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Analyzing...</span>
                </>
              ) : (
                'Analyze'
              )}
            </button>
          </div>
        </form>

        {/* Example Chips */}
        <div className="analyze-examples-row">
          <span className="examples-label">Examples:</span>
          {['8.8.8.8', '1.1.1.1', '103.21.244.1'].map((ip) => (
            <button
              key={ip}
              type="button"
              className="example-chip-btn"
              onClick={() => handleChipClick(ip)}
              disabled={loading}
            >
              {ip}
            </button>
          ))}
        </div>

        {/* Validation or API Error Alerts */}
        {validationError && (
          <div className="alert-error" style={{ marginTop: '16px' }}>
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        {error && (
          <div className="alert-error" style={{ marginTop: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className="quick-actions-section">
        <h2 className="quick-actions-heading">Quick Actions</h2>
        <div className="quick-actions-grid">
          {/* Card 1: Single IP */}
          <div
            className="quick-action-card"
            onClick={() => handleQuickAction('single')}
            role="button"
            tabIndex={0}
          >
            <div className="quick-action-icon-wrap">
              <MapPin size={22} />
            </div>
            <div className="quick-action-info">
              <div className="quick-action-title">Single IP Analysis</div>
              <div className="quick-action-desc">Analyze one IP address</div>
            </div>
          </div>

          {/* Card 2: Multiple IP */}
          <div
            className="quick-action-card"
            onClick={() => handleQuickAction('multiple')}
            role="button"
            tabIndex={0}
          >
            <div className="quick-action-icon-wrap">
              <Network size={22} />
            </div>
            <div className="quick-action-info">
              <div className="quick-action-title">Multiple IP Analysis</div>
              <div className="quick-action-desc">Analyze multiple IPs</div>
            </div>
          </div>

          {/* Card 3: View History */}
          <div
            className="quick-action-card"
            onClick={() => handleQuickAction('history')}
            role="button"
            tabIndex={0}
          >
            <div className="quick-action-icon-wrap">
              <History size={22} />
            </div>
            <div className="quick-action-info">
              <div className="quick-action-title">View History</div>
              <div className="quick-action-desc">Check previous searches</div>
            </div>
          </div>

          {/* Card 4: Export Results */}
          <div
            className="quick-action-card"
            onClick={() => handleQuickAction('export')}
            role="button"
            tabIndex={0}
          >
            <div className="quick-action-icon-wrap">
              <Download size={22} />
            </div>
            <div className="quick-action-info">
              <div className="quick-action-title">Export Results</div>
              <div className="quick-action-desc">Download reports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
