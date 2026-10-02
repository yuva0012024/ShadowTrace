/**
 * Formats an ISO date string or Date object into human-readable timestamp.
 */
export function formatDate(dateString) {
  if (!dateString) return 'Not available';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Not available';

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return 'Not available';
  }
}

/**
 * Short date format for compact table views.
 */
export function formatShortDate(dateString) {
  if (!dateString) return 'Not available';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Not available';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return 'Not available';
  }
}

/**
 * Formats date as YYYY-MM-DD HH:mm to match master mockup table specification.
 */
export function formatTableDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '—';
  }
}
