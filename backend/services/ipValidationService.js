const net = require('net');

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // 10.0.0.0/8
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (parts[0] >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  // Unique local addresses fc00::/7 (fc00 - fdff)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // Link-local fe80::/10
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // Multicast ff00::/8
  if (lower.startsWith('ff')) return true;
  return false;
}

/**
 * Validates an IP string and returns metadata.
 */
function validateIP(rawIp) {
  if (!rawIp || typeof rawIp !== 'string') {
    return {
      isValid: false,
      isPrivate: false,
      type: null,
      error: 'IP address must be a non-empty string.'
    };
  }

  const trimmed = rawIp.trim();
  if (!trimmed) {
    return {
      isValid: false,
      isPrivate: false,
      type: null,
      error: 'IP address cannot be empty.'
    };
  }

  const ipFamily = net.isIP(trimmed);
  if (ipFamily === 0) {
    return {
      isValid: false,
      isPrivate: false,
      type: null,
      ip: trimmed,
      error: `Malformed or invalid IP address format: "${trimmed}". Must be a valid IPv4 (e.g. 8.8.8.8) or IPv6 (e.g. 2001:4860:4860::8888).`
    };
  }

  const type = ipFamily === 4 ? 'IPv4' : 'IPv6';
  const isPrivate = type === 'IPv4' ? isPrivateIPv4(trimmed) : isPrivateIPv6(trimmed);

  return {
    isValid: true,
    isPrivate,
    type,
    ip: trimmed,
    note: isPrivate
      ? 'Private or reserved network address. Public Internet geolocation may not be available.'
      : null
  };
}

/**
 * Parses and sanitizes a multi-line or comma-separated string / array of IPs.
 * Removes empty entries and deduplicates while preserving order.
 */
function sanitizeIPList(input) {
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    list = input.split(/[\r\n,;\s]+/);
  }

  const cleaned = [];
  const seen = new Set();

  for (const item of list) {
    if (!item) continue;
    const trimmed = String(item).trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      cleaned.push(trimmed);
    }
  }

  return cleaned;
}

module.exports = {
  validateIP,
  sanitizeIPList,
  isPrivateIPv4,
  isPrivateIPv6
};
