import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getHistory } from '../services/api';
import { formatTableDate } from '../utils/formatDate';
import { formatLocation } from '../utils/formatLocation';
import shadowAgentImg from '../assets/images/shadowtrace-agent.png';

export default function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;

  const [query, setQuery] = useState(initialQuery);
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistoryData = async (searchTerm = '', pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getHistory(searchTerm, pageNum, 10);
      setSearches(res.searches || []);
      setTotalPages(res.totalPages || 1);
      setCurrentPage(res.currentPage || 1);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load intelligence history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(initialQuery, initialPage);
  }, [initialQuery, initialPage]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setSearchParams(query ? { q: query, page: 1 } : { page: 1 });
    fetchHistoryData(query, 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setSearchParams(query ? { q: query, page: newPage } : { page: newPage });
    fetchHistoryData(query, newPage);
  };

  const handleView = (search) => {
    const recordCount = search.ipRecords ? search.ipRecords.length : 0;
    if (recordCount > 1) {
      navigate(`/multiple-results/${search.searchNumber}`);
    } else {
      navigate(`/results/${search.searchNumber}`);
    }
  };

  return (
    <div className="page-container history-page">
      {/* Background shadow silhouette watermark */}
      <div className="history-agent-watermark">
        <img src={shadowAgentImg} alt="Agent Silhouette" />
      </div>

      {/* Header and Controls */}
      <div className="history-header-bar">
        <div>
          <h1 className="history-title">Search History</h1>
          <p className="history-subtitle">
            View and manage your previous IP searches.
          </p>
        </div>

        {/* Filter Input & Button */}
        <form onSubmit={handleFilterSubmit} className="history-filter-form">
          <div className="history-search-input-wrap">
            <Search size={15} className="history-search-icon" />
            <input
              type="text"
              className="history-search-input"
              placeholder="Search history..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="history-filter-btn">
            <Filter size={14} />
            <span>Filter</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* History Table Card */}
      <div className="history-table-card">
        <div className="table-responsive-wrapper">
          <table className="shadowtrace-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>Search ID</th>
                <th>IP Address(es)</th>
                <th>Location(s)</th>
                <th>Searched At</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell">
                    <Loader2 size={18} className="spin-animation" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
                    Loading intelligence records...
                  </td>
                </tr>
              ) : searches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell">
                    No searches recorded yet.
                  </td>
                </tr>
              ) : (
                searches.map((s, idx) => {
                  const records = s.ipRecords || [];
                  const ipList = records.map((r) => r.ipAddress).filter(Boolean);
                  const ipDisplay = ipList.slice(0, 2).join(', ') || 'Not recorded';
                  const moreIps = ipList.length > 2 ? ` (+${ipList.length - 2})` : '';

                  const locations = [
                    ...new Set(records.map((r) => formatLocation(r)).filter((l) => l && l !== 'Not available'))
                  ];
                  const locDisplay = locations.slice(0, 2).join('; ') || 'Not available';

                  const rowNumber = (currentPage - 1) * 10 + idx + 1;

                  return (
                    <tr key={s._id || s.searchNumber || idx}>
                      <td className="table-cell-index">{rowNumber}</td>
                      <td className="table-cell-search-id mono-font">
                        {s.searchNumber}
                      </td>
                      <td className="table-cell-ip mono-font">
                        {ipDisplay}{moreIps}
                      </td>
                      <td className="table-cell-location">
                        {locDisplay}
                      </td>
                      <td className="table-cell-time mono-font">
                        {formatTableDate(s.searchedAt)}
                      </td>
                      <td className="table-cell-action">
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handleView(s)}
                          title="Inspect Record"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching reference mockup */}
        {totalPages > 1 && (
          <div className="history-pagination-row">
            <button
              type="button"
              className="pagination-btn arrow-btn"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`pagination-btn ${pageNum === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="pagination-btn arrow-btn"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
