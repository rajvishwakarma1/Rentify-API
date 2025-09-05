const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    version: 'v1',
    requestId: req.id,
    db: {
      state: dbState,
      status: statusMap[dbState] || 'unknown',
    },
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
