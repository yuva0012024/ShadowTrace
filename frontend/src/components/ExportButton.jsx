import { FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportSearch } from '../services/api';

export default function ExportButton({ searchId, searchNumber }) {
  const [loadingFormat, setLoadingFormat] = useState(null);

  const handleExport = async (format) => {
    if (!searchId && !searchNumber) return;
    setLoadingFormat(format);
    try {
      await exportSearch(searchNumber || searchId, format);
    } catch (err) {
      alert(`Export failed: ${err.message || 'Unable to download export file'}`);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => handleExport('json')}
        disabled={loadingFormat !== null}
        style={{ padding: '8px 14px', fontSize: '0.82rem' }}
        title="Export Intelligence Dossier as JSON"
      >
        {loadingFormat === 'json' ? <Loader2 size={14} className="pulse-live" /> : <FileJson size={14} color="var(--gold-primary)" />}
        <span>JSON</span>
      </button>

      <button
        type="button"
        className="btn-secondary"
        onClick={() => handleExport('csv')}
        disabled={loadingFormat !== null}
        style={{ padding: '8px 14px', fontSize: '0.82rem' }}
        title="Export Intelligence Dossier as CSV spreadsheet"
      >
        {loadingFormat === 'csv' ? <Loader2 size={14} className="pulse-live" /> : <FileSpreadsheet size={14} color="var(--gold-primary)" />}
        <span>CSV</span>
      </button>
    </div>
  );
}
