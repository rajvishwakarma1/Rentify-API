// Health route
const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/healthController');

/**
 * @route GET /health
 * @desc API and database health check
 * @access Public
 */
router.get('/', getHealth);

module.exports = router;
