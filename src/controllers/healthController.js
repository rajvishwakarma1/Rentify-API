// Health Controller
const { checkDatabaseHealth } = require('../utils/database');

/**
 * GET /health
 * Returns API and database status, version, and request ID.
 */
exports.getHealth = async (req, res, next) => {
  const start = Date.now();
  try {
    const dbStatus = await checkDatabaseHealth();
    const latencyMs = Date.now() - start;
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus.status,
        latencyMs,
        readyState: dbStatus.readyState
      },
      requestId: req.id
    });
  } catch (err) {
    err.message = 'Database health check failed: ' + err.message;
    next(err);
  }
};
