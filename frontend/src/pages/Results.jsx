import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react';
import IPResultCard from '../components/IPResultCard';
import MapView from '../components/MapView';
import { getSearchById } from '../services/api';
import { formatTableDate } from '../utils/formatDate';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadResult() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getSearchById(id);
        if (isMounted) {
          if (res.data) {
            setSearchData(res.data);
            setError(null);
          } else {
            setError(`Search session "${id}" was not found.`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load search results.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadResult();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state-card">
          <Loader2 size={32} className="spin-animation" color="var(--gold-primary)" />
          <span>Retrieving intelligence dossier for {id}...</span>
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
          <ArrowLeft size={16} /> Back to Search History
        </button>
        <div className="alert-error">
          <AlertCircle size={20} />
          <span>{error || 'No search session found.'}</span>
        </div>
      </div>
    );
  }

  const records = searchData.ipRecords || [];
  const primaryRecord = records[0];
  const formattedDate = formatTableDate(searchData.searchedAt);

  return (
    <div className="page-container results-page">
      {/* Background shadow agent watermark */}
      <div className="results-agent-watermark">
        <img src={shadowAgentImg} alt="Agent Silhouette" />
      </div>

      {/* Header Info */}
      <div className="results-header-section">
        <div className="results-title-row">
          <div>
            <h1 className="results-title">IP Analysis Results</h1>
            <div className="results-meta-subtitle">
              <span>Search ID: <strong>{searchData.searchNumber}</strong></span>
              <span className="results-meta-divider">|</span>
              <span>Date: <strong>{formattedDate}</strong></span>
            </div>
          </div>

          <div className="results-actions-group">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/analyze')}
              style={{ fontSize: '0.82rem' }}
            >
              New Search
            </button>
            <button
              type="button"
              className="btn-gold-outline"
              onClick={() => navigate('/export')}
              style={{ fontSize: '0.82rem' }}
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Split: Left Info Card, Right Leaflet Map */}
      <div className="results-split-grid">
        <div className="results-left-col">
          <IPResultCard
            record={primaryRecord}
            searchNumber={searchData.searchNumber}
          />
        </div>

        <div className="results-right-col">
          <MapView
            records={records}
            height={440}
            showNotice={true}
            usePins={true}
          />
        </div>
      </div>
    </div>
  );
}
