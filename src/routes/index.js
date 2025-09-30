const router = require('express').Router();

// Health check endpoint
router.use('/health', require('./health'));

// Properties CRUD endpoints
router.use('/properties', require('./properties'));

// Advanced search endpoint
router.use('/search', require('./search'));

// Reservations management endpoints
router.use('/reservations', require('./reservations'));

// Analytics endpoints
router.use('/analytics', require('./analytics'));

module.exports = router;
