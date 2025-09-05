const express = require('express');
const { validate } = require('../middleware/validation');
const ctrl = require('../controllers/analyticsController');
const { propertyAnalyticsSchema, revenueAnalyticsSchema, amenityAnalyticsSchema, cityAnalyticsSchema, performanceAnalyticsSchema } = require('../validation/analyticsValidation');

const router = express.Router();

router.get('/properties', validate(propertyAnalyticsSchema, 'query'), (req, res, next) => { res.set('Cache-Control', 'public, max-age=300'); next(); }, ctrl.getPropertyAnalytics);
router.get('/revenue', validate(revenueAnalyticsSchema, 'query'), (req, res, next) => { res.set('Cache-Control', 'public, max-age=600'); next(); }, ctrl.getRevenueAnalytics);
router.get('/amenities', validate(amenityAnalyticsSchema, 'query'), (req, res, next) => { res.set('Cache-Control', 'public, max-age=300'); next(); }, ctrl.getAmenityPopularity);
router.get('/cities', validate(cityAnalyticsSchema, 'query'), (req, res, next) => { res.set('Cache-Control', 'public, max-age=300'); next(); }, ctrl.getCityPerformance);
router.get('/performance', validate(performanceAnalyticsSchema, 'query'), ctrl.getPerformanceStats);

module.exports = router;
