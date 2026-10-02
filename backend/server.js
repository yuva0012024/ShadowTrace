const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

console.log('[ShadowTrace] Starting backend...');

// 1. Load environment variables with explicit path to guarantee correct backend/.env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const connectDB = require('./config/database');
const apiConfig = require('./config/api');
const seedAdmin = require('./config/seedAdmin');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const historyRoutes = require('./routes/historyRoutes');
const exportRoutes = require('./routes/exportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 2. Configure Express
const app = express();
const PORT = apiConfig.server.port;

// 3. Configure CORS - dynamically support local development and production Vercel frontend
const defaultAllowedOrigins = [
  'https://shadow-trace-murex.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

const getPermittedOrigins = () => {
  const envOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman, curl, internal server calls)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const permitted = getPermittedOrigins();

    // Exact matches from list or configured CLIENT_ORIGIN
    if (permitted.includes(cleanOrigin)) {
      return callback(null, cleanOrigin);
    }

    // Dynamic localhost / 127.0.0.1 on ANY port for local development (e.g. Vite 5173, 5174, 5175)
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
    if (isLocalhost) {
      return callback(null, cleanOrigin);
    }

    // Dynamic Vercel deployment support for ShadowTrace previews/production
    const isVercelDeployment = /^https:\/\/shadow-trace(-[a-z0-9-]+)?\.vercel\.app$/.test(cleanOrigin);
    if (isVercelDeployment) {
      return callback(null, cleanOrigin);
    }

    console.warn(`[CORS] Rejected unpermitted origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 4. Configure middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Health & Diagnostic Routes (mounted BEFORE rate limiter so health checks are never throttled)
// GET /api/health - Pure Express heartbeat, instant, zero external dependencies
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    service: 'ShadowTrace Backend',
    status: 'online',
    database: isDbConnected ? 'connected' : 'disconnected',
    services: {
      backend: 'operational',
      database: isDbConnected ? 'connected' : 'disconnected'
    },
    message: 'ShadowTrace backend is running'
  });
});

// GET /api/settings/status - Detailed diagnostic endpoint
app.get('/api/settings/status', async (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  
  let javaInfo = { status: 'offline', details: null };
  try {
    const javaRes = await axios.get(`${apiConfig.javaService.baseUrl}/api/java/health`, {
      timeout: 1500
    });
    javaInfo = { status: 'connected', details: javaRes.data };
  } catch {
    javaInfo = { status: 'offline', details: 'Java analytical service is not currently running or unreachable' };
  }

  res.status(200).json({
    system: 'ShadowTrace Location Intelligence',
    version: '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    database: {
      status: mongoConnected ? 'Connected' : 'Disconnected',
      host: mongoose.connection.host || '127.0.0.1',
      name: mongoose.connection.name || 'shadowtrace'
    },
    geolocationProvider: {
      endpoint: apiConfig.geolocation.apiUrl,
      apiKeyConfigured: !!apiConfig.geolocation.apiKey,
      status: 'Active'
    },
    javaService: javaInfo,
    serverUptimeSeconds: Math.floor(process.uptime())
  });
});

// Apply general API rate limiter to all subsequent application endpoints
app.use('/api', apiLimiter);

// Guard middleware for DB-dependent operations
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn(`[Database] Request to ${req.method} ${req.originalUrl} failed: MongoDB is disconnected`);
    return res.status(503).json({
      success: false,
      error: 'Database service is temporarily unavailable.'
    });
  }
  next();
};

app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/admin', requireDatabase, adminRoutes);
app.use('/api/profile', requireDatabase, profileRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', requireDatabase, historyRoutes);
app.use('/api/export', requireDatabase, exportRoutes);
app.use('/api/notifications', requireDatabase, notificationRoutes);

// 6. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Global safety handlers to prevent server crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ShadowTrace] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[ShadowTrace] Uncaught Exception:', err.message, err.stack);
});

// 7. Start HTTP Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(' SHADOWTRACE - Digital Location Intelligence System');
  console.log(' TRACE • ANALYZE • REVEAL');
  console.log(` [ShadowTrace] API listening on port ${PORT}`);
  console.log(' [ShadowTrace] Health endpoint ready: GET /api/health');
  console.log('====================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ShadowTrace] ERROR: Port ${PORT} is already in use by another process.`);
    console.error(`[ShadowTrace] Please stop the existing process on port ${PORT} or reuse the running instance.`);
    process.exit(1);
  } else {
    console.error('[ShadowTrace] Server error:', err.message);
  }
});

// 8. Graceful Shutdown
const gracefulShutdown = () => {
  console.log('[ShadowTrace] Shutting down backend gracefully...');
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('[ShadowTrace] MongoDB connection closed.');
    } catch (err) {
      console.error('[ShadowTrace] Error closing MongoDB connection:', err.message);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const { verifyEmailService } = require('./services/emailService');

// 9. Connect/initialize MongoDB asynchronously and verify email service
connectDB().then((conn) => {
  if (conn) {
    seedAdmin();
  }
});

// Verify Resend email service configuration on startup
verifyEmailService();

module.exports = { app, server };
