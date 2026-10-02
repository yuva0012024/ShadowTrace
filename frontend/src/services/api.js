import axios from 'axios';

// Centralized API Base URL configured via Vite env or defaults to local Node backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

if (import.meta.env.DEV) {
  console.log(`[ShadowTrace] API Base URL: ${API_BASE_URL}`);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Classifies an Axios or network error into precise, user-friendly and actionable messages.
 * Prevents generic "Network Error" propagation.
 */
export function classifyApiError(error) {
  // Handle explicit request cancellation
  if (
    axios.isCancel(error) ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED' ||
    error?.message === 'canceled'
  ) {
    return {
      type: 'CANCELED',
      message: 'Request was intentionally cancelled.',
      isCanceled: true
    };
  }

  // Handle HTTP response errors from backend
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data || {};
    const backendMsg = data.error || data.message;

    // Specific OTP & Auth error classifications
    if (typeof backendMsg === 'string') {
      const lower = backendMsg.toLowerCase();
      if (lower.includes('expired')) {
        return {
          type: 'OTP_EXPIRED',
          message: 'Verification code expired. Request a new code.',
          status
        };
      }
      if (lower.includes('too many') || (status === 429 && lower.includes('otp')) || (status === 429 && lower.includes('wait'))) {
        return {
          type: 'OTP_RATE_LIMITED',
          message: backendMsg,
          status
        };
      }
      if (lower.includes('invalid verification') || lower.includes('invalid otp') || lower.includes('verification code must be') || lower.includes('no active verification') || lower.includes('no active login')) {
        return {
          type: 'INVALID_OTP',
          message: 'Invalid verification code.',
          status
        };
      }
      if (
        data.code === 'SMTP_NOT_CONFIGURED' ||
        data.code === 'SMTP_AUTH_FAILED' ||
        data.code === 'SMTP_CONNECTION_FAILED' ||
        data.code === 'RECIPIENT_REJECTED' ||
        data.code === 'EMAIL_SEND_FAILED' ||
        lower.includes('email delivery failed') ||
        lower.includes('unable to send verification') ||
        lower.includes('smtp configuration')
      ) {
        return {
          type: data.code || 'EMAIL_SEND_FAILED',
          message: backendMsg || 'Unable to send verification email. Please try again.',
          status
        };
      }
      if (lower.includes('email not registered') || lower.includes('unregistered email')) {
        return {
          type: 'EMAIL_NOT_REGISTERED',
          message: 'Email not registered.',
          status
        };
      }
      if (lower.includes('invalid credentials') || lower.includes('invalid email or password')) {
        return {
          type: 'AUTHENTICATION_FAILED',
          message: 'Invalid credentials.',
          status
        };
      }
    }

    // MongoDB / Database / Server failure (503)
    if (status === 503) {
      return {
        type: 'SERVER_UNAVAILABLE',
        message: 'Server temporarily unavailable.',
        status
      };
    }
    if (
      status === 503 &&
      (backendMsg === 'Database service is temporarily unavailable.' ||
       (typeof backendMsg === 'string' && (backendMsg.includes('Database') || backendMsg.includes('Mongo'))))
    ) {
      return {
        type: 'DATABASE_UNAVAILABLE',
        message: 'Database service is temporarily unavailable.',
        status
      };
    }

    // External Geolocation API failure (503)
    if (
      data.error === 'GEOLOCATION_SERVICE_UNAVAILABLE' ||
      (typeof backendMsg === 'string' && backendMsg.includes('IP location service is temporarily unavailable'))
    ) {
      return {
        type: 'GEOLOCATION_UNAVAILABLE',
        message: 'Location intelligence service temporarily unavailable.',
        status
      };
    }

    // 401 Unauthorized
    if (status === 401) {
      return {
        type: 'AUTHENTICATION_FAILED',
        message: 'Invalid email or password.',
        status
      };
    }

    // 403 Forbidden
    if (status === 403) {
      return {
        type: 'FORBIDDEN',
        message: typeof backendMsg === 'string' && backendMsg.includes('deactivated')
          ? backendMsg
          : 'You do not have permission to access this resource.',
        status
      };
    }

    // 404 Not Found
    if (status === 404) {
      return {
        type: 'NOT_FOUND',
        message: 'Requested service was not found.',
        status
      };
    }

    // 429 Too Many Requests
    if (status === 429) {
      return {
        type: 'OTP_RATE_LIMITED',
        message: backendMsg || 'Too many requests. Please wait before retrying.',
        status
      };
    }

    // 500+ Internal Server Error
    if (status >= 500) {
      return {
        type: 'SERVER_ERROR',
        message: backendMsg || 'ShadowTrace server encountered an internal error.',
        status
      };
    }

    // Any other 4xx client errors (400, 409 duplicate user, 422, etc.)
    return {
      type: 'VALIDATION_ERROR',
      message: backendMsg || 'Something went wrong. Please try again.',
      status
    };
  }

  // Network / Transport level errors (No response received)
  const code = error?.code;
  const rawMsg = error?.message || '';

  // Timeout
  if (code === 'ECONNABORTED' || rawMsg.toLowerCase().includes('timeout')) {
    return {
      type: 'TIMEOUT',
      message: 'Request timed out. Please try again.'
    };
  }

  // CORS Failure
  if (rawMsg.includes('CORS') || code === 'ERR_CORS') {
    if (import.meta.env.DEV) {
      console.warn('[API] CORS configuration mismatch detected for origin:', window.location.origin);
    }
    return {
      type: 'CORS_FAILURE',
      message: 'Connecting to ShadowTrace services...'
    };
  }

  // Backend Unreachable / Connection Refused / Network Error
  if (
    code === 'ERR_NETWORK' ||
    rawMsg === 'Network Error' ||
    code === 'ECONNREFUSED' ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('Failed to fetch')
  ) {
    if (import.meta.env.DEV) {
      console.warn(`[API] Backend unreachable at ${error?.config?.baseURL || API_BASE_URL}:`, rawMsg);
    }
    return {
      type: 'BACKEND_UNREACHABLE',
      message: 'Connecting to ShadowTrace services...'
    };
  }

  return {
    type: 'UNKNOWN',
    message: rawMsg && rawMsg !== 'Network Error' ? rawMsg : 'Something went wrong. Please try again.'
  };
}

// Request interceptor: Attach Authorization header and log in dev (without credentials)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shadowtrace_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      const sanitizedUrl = config.url?.startsWith('http') 
        ? config.url 
        : `${config.baseURL?.replace(/\/+$/, '')}/${config.url?.replace(/^\/+/, '')}`;
      console.log(`[API] Request: ${config.method?.toUpperCase()} ${sanitizedUrl}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle session invalidation and error classification
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const classified = classifyApiError(error);
    error.classified = classified;
    error.userMessage = classified.message;
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      error.message = classified.message;
    }

    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/signup');
      if (!isAuthRoute) {
        localStorage.removeItem('shadowtrace_token');
        localStorage.removeItem('shadowtrace_user');
      }
    }

    if (import.meta.env.DEV && !classified.isCanceled) {
      console.warn(`[API] Error (${classified.type}):`, classified.message);
    }

    return Promise.reject(error);
  }
);

/* ========================================================
   HEALTH & DIAGNOSTIC APIS
   ======================================================== */

/**
 * Fast heartbeat check against backend Express server
 * GET /api/health
 */
export async function checkBackendHealth(options = {}) {
  const response = await apiClient.get('/health', {
    timeout: options.timeout || 3500,
    signal: options.signal
  });
  return response.data;
}

/**
 * Health check & diagnostic status with full system details
 * GET /api/settings/status
 */
export async function getSystemStatus(options = {}) {
  const response = await apiClient.get('/settings/status', {
    signal: options.signal
  });
  return response.data;
}

/* ========================================================
   AUTHENTICATION APIS
   ======================================================== */

/**
 * Register a new user account
 * POST /api/auth/signup
 */
export async function signupUser(userData, options = {}) {
  const response = await apiClient.post('/auth/signup', userData, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Initiate registration by requesting a 6-digit email verification OTP
 * POST /api/auth/register-otp
 */
export async function sendRegistrationOtp(firstArg, emailArg, passwordArg, options = {}) {
  const payload = (typeof firstArg === 'object' && firstArg !== null)
    ? firstArg
    : { fullName: firstArg, email: emailArg, password: passwordArg };
  const opt = (typeof firstArg === 'object' && firstArg !== null) ? (emailArg || {}) : options;
  const response = await apiClient.post('/auth/register-otp', payload, {
    signal: opt?.signal
  });
  return response.data;
}

/**
 * Verify 6-digit OTP and complete account registration
 * POST /api/auth/verify-otp
 */
export async function verifyRegistrationOtp(firstArg, otpArg, options = {}) {
  const payload = (typeof firstArg === 'object' && firstArg !== null)
    ? firstArg
    : { email: firstArg, otp: otpArg };
  const opt = (typeof firstArg === 'object' && firstArg !== null) ? (otpArg || {}) : options;
  const response = await apiClient.post('/auth/verify-otp', payload, {
    signal: opt?.signal
  });
  return response.data;
}

/**
 * Verify 6-digit OTP and complete secure 2FA login session
 * POST /api/auth/verify-login-otp
 */
export async function verifyLoginOtp(firstArg, otpArg, options = {}) {
  const payload = (typeof firstArg === 'object' && firstArg !== null)
    ? firstArg
    : { email: firstArg, otp: otpArg };
  const opt = (typeof firstArg === 'object' && firstArg !== null) ? (otpArg || {}) : options;
  const response = await apiClient.post('/auth/verify-login-otp', payload, {
    signal: opt?.signal
  });
  return response.data;
}

/**
 * Resend 6-digit verification code to email (with 60-second rate limiting)
 * POST /api/auth/resend-otp
 */
export async function resendRegistrationOtp(email, purpose = 'SIGNUP', options = {}) {
  const payload = typeof email === 'object' && email !== null
    ? email
    : { email, purpose: typeof purpose === 'string' ? purpose : 'SIGNUP' };
  const opt = typeof email === 'object' ? purpose || {} : options;
  const response = await apiClient.post('/auth/resend-otp', payload, {
    signal: opt?.signal
  });
  return response.data;
}

/**
 * Log into user or administrator account (initiates 2FA OTP verification)
 * POST /api/auth/login
 */
export async function loginUser(credentials, options = {}) {
  const response = await apiClient.post('/auth/login', credentials, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Log out of current session
 * POST /api/auth/logout
 */
export async function logoutUser(options = {}) {
  try {
    const response = await apiClient.post('/auth/logout', {}, {
      signal: options.signal
    });
    return response.data;
  } catch {
    return { success: true };
  }
}

/**
 * Verify session and fetch authenticated user profile
 * GET /api/auth/me
 */
export async function getCurrentUser(options = {}) {
  const response = await apiClient.get('/auth/me', {
    signal: options.signal
  });
  return response.data;
}

/* ========================================================
   ADMIN MANAGEMENT APIS
   ======================================================== */

/**
 * Retrieve system intelligence stats for Admin Dashboard
 * GET /api/admin/stats
 */
export async function getAdminStats(options = {}) {
  const response = await apiClient.get('/admin/stats', {
    signal: options.signal
  });
  return response.data;
}

/**
 * Retrieve list of all registered users
 * GET /api/admin/users
 */
export async function getAdminUsers(options = {}) {
  const response = await apiClient.get('/admin/users', {
    signal: options.signal
  });
  return response.data;
}

/**
 * Retrieve single user profile and their search history
 * GET /api/admin/users/:id
 */
export async function getAdminUserById(id, options = {}) {
  const response = await apiClient.get(`/admin/users/${encodeURIComponent(id)}`, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Toggle active/suspended state of a user
 * PATCH /api/admin/users/:id/status
 */
export async function toggleAdminUserStatus(id, isActive, options = {}) {
  const response = await apiClient.patch(`/admin/users/${encodeURIComponent(id)}/status`, { isActive }, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Permanently delete operative dossier and associated data (Admin only)
 * DELETE /api/admin/users/:id
 */
export async function deleteAdminUser(id, options = {}) {
  const response = await apiClient.delete(`/admin/users/${encodeURIComponent(id)}`, {
    signal: options.signal
  });
  return response.data;
}

/* ========================================================
   IP ANALYSIS & RECONNAISSANCE APIS
   ======================================================== */

/**
 * Analyzes a single IP address
 * POST /api/analyze/single
 */
export async function analyzeSingleIP(ip, options = {}) {
  const response = await apiClient.post('/analyze/single', { ip }, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Analyzes multiple IP addresses in a batch
 * POST /api/analyze/multiple
 */
export async function analyzeMultipleIPs(ips, options = {}) {
  const response = await apiClient.post('/analyze/multiple', { ips }, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Retrieves search history with filtering & pagination for authenticated user
 * GET /api/history
 */
export async function getHistory(query = '', page = 1, limit = 50, options = {}) {
  const response = await apiClient.get('/history', {
    params: { query, page, limit },
    signal: options.signal
  });
  return response.data;
}

/**
 * Retrieves a single search session and its IP records by ID or SearchNumber
 * GET /api/history/:id
 */
export async function getSearchById(id, options = {}) {
  const response = await apiClient.get(`/history/${encodeURIComponent(id)}`, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Retrieves live intelligence dashboard statistics for authenticated user
 * GET /api/history/stats
 */
export async function getDashboardStats(options = {}) {
  const response = await apiClient.get('/history/stats', {
    signal: options.signal
  });
  return response.data;
}

/**
 * Downloads exported search session data in CSV or JSON format
 * GET /api/export/:id?format=csv|json
 */
export async function exportSearch(id, format = 'json', options = {}) {
  const response = await apiClient.get(`/export/${encodeURIComponent(id)}`, {
    params: { format },
    responseType: 'blob',
    signal: options.signal
  });

  const blob = new Blob([response.data], {
    type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;'
  });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', `shadowtrace_${id.toLowerCase()}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);

  return true;
}

/**
 * Calculates distance between two coordinates via Java analytics service or fallback
 */
export async function computeCoordinatesDistance(lat1, lon1, lat2, lon2, options = {}) {
  try {
    const javaUrl = import.meta.env.VITE_JAVA_SERVICE_URL || 'http://localhost:8080';
    const res = await axios.post(`${javaUrl}/api/java/analytics/distance`, {
      lat1, lon1, lat2, lon2
    }, { 
      timeout: options.timeout || 3000,
      signal: options.signal 
    });
    return res.data;
  } catch {
    return null;
  }
}

/* ========================================================
   PROFILE APIS
   ======================================================== */

/**
 * Retrieve authenticated profile dossier with MongoDB statistics
 * GET /api/profile
 */
export async function getProfile(options = {}) {
  const response = await apiClient.get('/profile', {
    signal: options.signal
  });
  return response.data;
}

/**
 * Update authenticated profile information (Name, Avatar)
 * PUT /api/profile
 */
export async function updateProfile(data, options = {}) {
  const response = await apiClient.put('/profile', data, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Change security password
 * POST /api/profile/change-password
 */
export async function changePassword(data, options = {}) {
  const response = await apiClient.post('/profile/change-password', data, {
    signal: options.signal
  });
  return response.data;
}

/* ========================================================
   NOTIFICATION APIS
   ======================================================== */

/**
 * Fetch authenticated operative notifications
 * GET /api/notifications
 */
export async function getNotifications(limit = 30, options = {}) {
  const response = await apiClient.get('/notifications', {
    params: { limit },
    signal: options.signal
  });
  return response.data;
}

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
export async function markNotificationRead(id, options = {}) {
  const response = await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`, {}, {
    signal: options.signal
  });
  return response.data;
}

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export async function markAllNotificationsRead(options = {}) {
  const response = await apiClient.patch('/notifications/read-all', {}, {
    signal: options.signal
  });
  return response.data;
}

export default apiClient;

