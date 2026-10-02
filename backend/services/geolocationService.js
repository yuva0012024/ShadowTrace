const axios = require('axios');
const dns = require('dns').promises;
const apiConfig = require('../config/api');
const { validateIP } = require('./ipValidationService');
const { normalizeField, normalizeCoordinate } = require('../utils/helpers');

/**
 * Attempts a reverse DNS lookup to find the PTR hostname for an IP.
 */
async function resolveHostname(ip) {
  try {
    const hostnames = await dns.reverse(ip);
    if (hostnames && hostnames.length > 0) {
      return hostnames[0];
    }
  } catch {
    // Reverse DNS may fail or have no PTR record; that is normal
  }
  return 'Not available';
}

/**
 * Fetches real geolocation data from external provider.
 */
async function fetchGeolocationFromApi(ip) {
  const url = `${apiConfig.geolocation.apiUrl.replace(/\/+$/, '')}/${encodeURIComponent(ip)}`;
  const params = {
    fields: 'status,message,country,regionName,district,city,lat,lon,timezone,isp,org,as,query,reverse'
  };

  if (apiConfig.geolocation.apiKey) {
    params.key = apiConfig.geolocation.apiKey;
  }

  const response = await axios.get(url, {
    params,
    timeout: apiConfig.geolocation.timeoutMs,
    headers: {
      'User-Agent': 'ShadowTrace-Intelligence-System/1.0'
    }
  });

  return response.data;
}

/**
 * Analyzes a single IP address: validates, fetches external data,
 * normalizes fields, and resolves reverse DNS if needed.
 */
async function lookupIP(rawIp) {
  const validation = validateIP(rawIp);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const ip = validation.ip;

  // Handle private / reserved address
  if (validation.isPrivate) {
    const localHostname = await resolveHostname(ip);
    return {
      ipAddress: ip,
      hostname: localHostname,
      country: 'Private / Reserved',
      region: 'Local Network',
      district: 'Not available',
      city: 'Internal Range',
      latitude: null,
      longitude: null,
      isp: 'Private Network',
      asn: 'Not available',
      timezone: 'Not available',
      organization: 'Local Infrastructure',
      isPrivate: true,
      note: 'Private or reserved network address. Public Internet geolocation is not available for internal networks.'
    };
  }

  let apiData = null;
  try {
    apiData = await fetchGeolocationFromApi(ip);
  } catch (apiErr) {
    const err = new Error('IP location service is temporarily unavailable.');
    err.code = 'GEOLOCATION_SERVICE_UNAVAILABLE';
    err.statusCode = 503;
    throw err;
  }

  if (apiData && apiData.status === 'fail') {
    throw new Error(`Geolocation provider rejected query for "${ip}": ${apiData.message || 'Lookup failed'}`);
  }

  // Hostname resolution: prioritize provider reverse, fallback to dns.reverse
  let resolvedHost = normalizeField(apiData?.reverse);
  if (resolvedHost === 'Not available') {
    resolvedHost = await resolveHostname(ip);
  }

  return {
    ipAddress: ip,
    hostname: resolvedHost,
    country: normalizeField(apiData?.country),
    region: normalizeField(apiData?.regionName),
    district: normalizeField(apiData?.district),
    city: normalizeField(apiData?.city),
    latitude: normalizeCoordinate(apiData?.lat),
    longitude: normalizeCoordinate(apiData?.lon),
    isp: normalizeField(apiData?.isp),
    asn: normalizeField(apiData?.as),
    timezone: normalizeField(apiData?.timezone),
    organization: normalizeField(apiData?.org),
    isPrivate: false
  };
}

module.exports = {
  lookupIP,
  resolveHostname
};
