const { getSearchById } = require('./historyService');
const { escapeCsv } = require('../utils/helpers');

/**
 * Generates an export payload (JSON or CSV) for a specific search ID,
 * ensuring the user owns the search (or is an admin).
 */
async function generateExport(searchId, format = 'json', userId = null, userRole = 'user') {
  const search = await getSearchById(searchId, userId, userRole);
  if (!search) {
    const error = new Error(`Search session "${searchId}" not found or unauthorized.`);
    error.status = 404;
    throw error;
  }

  const records = search.ipRecords || [];

  if (format.toLowerCase() === 'csv') {
    const headers = [
      'Search Number',
      'Searched At',
      'IP Address',
      'Hostname',
      'Country',
      'State / Region',
      'District',
      'City',
      'Latitude',
      'Longitude',
      'ISP',
      'ASN',
      'Timezone',
      'Organization'
    ];

    const rows = records.map(rec => [
      escapeCsv(search.searchNumber),
      escapeCsv(new Date(search.searchedAt).toISOString()),
      escapeCsv(rec.ipAddress),
      escapeCsv(rec.hostname),
      escapeCsv(rec.country),
      escapeCsv(rec.region),
      escapeCsv(rec.district),
      escapeCsv(rec.city),
      escapeCsv(rec.latitude !== null ? rec.latitude : 'Not available'),
      escapeCsv(rec.longitude !== null ? rec.longitude : 'Not available'),
      escapeCsv(rec.isp),
      escapeCsv(rec.asn),
      escapeCsv(rec.timezone),
      escapeCsv(rec.organization)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `shadowtrace_${search.searchNumber.toLowerCase()}.csv`,
      data: csvContent
    };
  }

  // Default JSON export
  const exportPayload = {
    system: 'SHADOWTRACE Intelligence System',
    disclaimer: 'IP-based location is approximate. Geolocation does not represent exact physical address or identity.',
    searchNumber: search.searchNumber,
    searchedAt: search.searchedAt,
    totalRecords: records.length,
    records: records.map(r => ({
      ipAddress: r.ipAddress,
      hostname: r.hostname,
      country: r.country,
      region: r.region,
      district: r.district,
      city: r.city,
      latitude: r.latitude,
      longitude: r.longitude,
      isp: r.isp,
      asn: r.asn,
      timezone: r.timezone,
      organization: r.organization,
      searchedAt: r.searchedAt
    }))
  };

  return {
    contentType: 'application/json; charset=utf-8',
    filename: `shadowtrace_${search.searchNumber.toLowerCase()}.json`,
    data: JSON.stringify(exportPayload, null, 2)
  };
}

module.exports = {
  generateExport
};
