/**
 * Normalizes any text field: if empty, undefined, null, or whitespace-only,
 * returns 'Not available'.
 */
function normalizeField(val) {
  if (val === null || val === undefined) return 'Not available';
  const str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') {
    return 'Not available';
  }
  return str;
}

/**
 * Normalizes numerical coordinates. Returns null if invalid or not provided.
 */
function normalizeCoordinate(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Escape CSV fields according to RFC 4180
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

module.exports = {
  normalizeField,
  normalizeCoordinate,
  escapeCsv
};
