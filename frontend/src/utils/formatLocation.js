/**
 * Country flag emoji dictionary for major jurisdictions
 */
const countryFlags = {
  'United States': '🇺🇸',
  'US': '🇺🇸',
  'USA': '🇺🇸',
  'India': '🇮🇳',
  'IN': '🇮🇳',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Germany': '🇩🇪',
  'DE': '🇩🇪',
  'France': '🇫🇷',
  'FR': '🇫🇷',
  'Canada': '🇨🇦',
  'CA': '🇨🇦',
  'Australia': '🇦🇺',
  'AU': '🇦🇺',
  'Japan': '🇯🇵',
  'JP': '🇯🇵',
  'Singapore': '🇸🇬',
  'SG': '🇸🇬',
  'Netherlands': '🇳🇱',
  'NL': '🇳🇱',
  'Brazil': '🇧🇷',
  'BR': '🇧🇷',
  'Ireland': '🇮🇪',
  'IE': '🇮🇪',
  'Switzerland': '🇨🇭',
  'CH': '🇨🇭',
  'Sweden': '🇸🇪',
  'SE': '🇸🇪',
  'Russia': '🇷🇺',
  'RU': '🇷🇺',
  'China': '🇨🇳',
  'CN': '🇨🇳',
  'South Korea': '🇰🇷',
  'KR': '🇰🇷',
  'Hong Kong': '🇭🇰',
  'HK': '🇭🇰',
  'Taiwan': '🇹🇼',
  'TW': '🇹🇼',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸'
};

export function getCountryFlag(country) {
  if (!country || country === 'Not available' || country === 'Private / Reserved') return '🌐';
  return countryFlags[country] || '🌐';
}

/**
 * Composes a full location string from city, region, and country.
 * Skips "Not available" components gracefully.
 */
export function formatLocation(record) {
  if (!record) return 'Not available';

  const parts = [];
  if (record.city && record.city !== 'Not available' && record.city !== 'Internal Range') parts.push(record.city);
  if (record.region && record.region !== 'Not available' && record.region !== 'Local Network') parts.push(record.region);
  if (record.country && record.country !== 'Not available' && record.country !== 'Private / Reserved') parts.push(record.country);

  if (parts.length === 0) {
    if (record.isPrivate || record.country === 'Private / Reserved') return 'Private Network';
    return 'Not available';
  }
  return parts.join(', ');
}

/**
 * Formats latitude and longitude coordinates with directional suffixes or decimals.
 */
export function formatCoordinates(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return 'Not available';
  }

  const numLat = Number(lat);
  const numLon = Number(lon);
  if (isNaN(numLat) || isNaN(numLon)) return 'Not available';

  const latDir = numLat >= 0 ? 'N' : 'S';
  const lonDir = numLon >= 0 ? 'E' : 'W';

  return `${Math.abs(numLat).toFixed(4)}° ${latDir}, ${Math.abs(numLon).toFixed(4)}° ${lonDir}`;
}
