// Analytics routes
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const ctrl = require('../controllers/analyticsController');
const Joi = require('joi');

// Validation schemas
const revenueQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
});

// GET /analytics/properties
router.get('/properties', verifyToken, ctrl.getPropertiesAnalytics);
// GET /analytics/amenities
router.get('/amenities', verifyToken, ctrl.getAmenitiesAnalytics);
// GET /analytics/cities
router.get('/cities', verifyToken, ctrl.getCitiesAnalytics);
// GET /analytics/revenue
router.get('/revenue', verifyToken, validate(revenueQuerySchema, 'query'), ctrl.getRevenueAnalytics);

module.exports = router;
