

require('dotenv').config();
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('WARNING: CORS_ORIGIN is not set in production. All cross-origin requests will be denied.');
}
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./utils/database');
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDatabase();
  } catch (e) {
    console.error('Failed to connect to database:', e);
    process.exit(1);
  }
  const server = app.listen(PORT, () => {
    console.log(`Rentify API server running on port ${PORT}`);
  });
  process.on('SIGINT', async () => {
    await disconnectDatabase();
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', async () => {
    await disconnectDatabase();
    server.close(() => process.exit(0));
  });
})();