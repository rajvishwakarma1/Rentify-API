const app = require('../src/app');
const { connectDatabase } = require('../src/config/database');

// Ensure DB connection on serverless cold start.
// Safe to call multiple times: connectDatabase is idempotent and guarded.
connectDatabase().catch((err) => {
	// eslint-disable-next-line no-console
	console.error('MongoDB initial connect failed (serverless):', err && err.message ? err.message : err);
});

module.exports = app;
