module.exports = {
  geolocation: {
    apiUrl: process.env.GEOLOCATION_API_URL || 'http://ip-api.com/json',
    apiKey: process.env.GEOLOCATION_API_KEY || null,
    timeoutMs: 8000,
    rateLimitPerMin: 45
  },
  javaService: {
    baseUrl: process.env.JAVA_SERVICE_URL || 'http://127.0.0.1:8080',
    timeoutMs: 4000
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5174'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'shadowtrace_dev_secret_key_change_in_production_2026',
    jwtExpiresIn: '7d',
    adminEmail: (process.env.ADMIN_EMAIL || 'admin@shadowtrace.local').toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD',
    adminName: process.env.ADMIN_NAME || 'ShadowTrace Administrator'
  }
};
