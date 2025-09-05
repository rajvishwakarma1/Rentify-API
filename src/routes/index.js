const express = require('express');
const mongoose = require('mongoose');
const { connectDatabase, getDbDiagnostics } = require('../config/database');

const router = express.Router();

// Root welcome
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rentify API',
    version: 'v1',
    links: {
      health: '/health',
      api: '/api/v1',
      properties: '/api/v1/properties',
      search: '/api/v1/search',
    },
    requestId: req.id,
  });
});

router.get('/health', async (req, res) => {
  // If not connected, trigger an async connect attempt (server, serverless parity)
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    connectDatabase().catch(() => {});
  }
  const diag = getDbDiagnostics();
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    version: 'v1',
    requestId: req.id,
    db: diag,
  });
});

const apiV1 = express.Router();
const propertiesRouter = require('./properties');
const searchRouter = require('./search');
const reservationsRouter = require('./reservations');
const analyticsRouter = require('./analytics');

apiV1.get('/', (req, res) => {
  res.json({ success: true, message: 'Rentify API v1' });
});

apiV1.use('/properties', propertiesRouter);
apiV1.use('/reservations', reservationsRouter);

router.use('/api/v1', apiV1);
apiV1.use('/search', searchRouter);
apiV1.use('/analytics', analyticsRouter);

module.exports = router;
