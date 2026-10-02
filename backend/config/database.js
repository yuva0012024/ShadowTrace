const mongoose = require('mongoose');

// Configure connection event listeners once
mongoose.connection.on('disconnected', () => {
  console.warn('[ShadowTrace] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[ShadowTrace] MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error('[ShadowTrace] MongoDB runtime error:', err.message);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log('[ShadowTrace] MongoDB connected');
    console.log(`[ShadowTrace] Database host: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[ShadowTrace] MongoDB Connection Error: ${error.message}`);
    // Do not crash server so that health status endpoint accurately reflects state
    return null;
  }
};

module.exports = connectDB;

