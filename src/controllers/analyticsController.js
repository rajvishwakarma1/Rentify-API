const { Property, Reservation } = require('../models');
const { logger } = require('../utils/logger');
const cache = require('../utils/cache');
const { successResponse } = require('../utils/responseHelpers');
const { wrapQuery } = require('../utils/queryMonitor');

exports.getPropertyAnalytics = async (req, res, next) => {
  try {
    await cache.connect();
    const key = cache.buildCacheKey('analytics:properties', { cityId: req.query.cityId });
    const ttl = Number(process.env.CACHE_TTL_FILTERS || 1800);
    const data = await cache.wrap(key, ttl, async () => wrapQuery(Property.getAnalytics({ cityId: req.query.cityId }), 'analytics:getPropertyAnalytics'));
    return successResponse(res, data);
  } catch (err) { return next(err); }
};

exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    await cache.connect();
  const { period = 'monthly', from, to, cityId } = req.query;
  const key = cache.buildCacheKey('analytics:revenue', { period, from, to, cityId });
    const ttl = Number(process.env.CACHE_TTL_FILTERS || 1800);
  const data = await cache.wrap(key, ttl, async () => wrapQuery(Reservation.aggregateRevenue({ period, from, to, cityId }), 'analytics:getRevenueAnalytics'));
    return successResponse(res, data);
  } catch (err) { return next(err); }
};

exports.getAmenityPopularity = async (req, res, next) => {
  try {
    await cache.connect();
    const key = cache.buildCacheKey('analytics:amenities', { cityId: req.query.cityId });
    const ttl = Number(process.env.CACHE_TTL_FILTERS || 1800);
    const data = await cache.wrap(key, ttl, async () => wrapQuery(Property.getPopularAmenities({ cityId: req.query.cityId }), 'analytics:getAmenityPopularity'));
    return successResponse(res, data);
  } catch (err) { return next(err); }
};

exports.getCityPerformance = async (req, res, next) => {
  try {
    // Simple proxy to property analytics by city for now
    req.query.cityId = req.query.cityId || undefined;
    return exports.getPropertyAnalytics(req, res, next);
  } catch (err) { return next(err); }
};

exports.getPerformanceStats = async (req, res, next) => {
  try {
    // Placeholder; could use queryMonitor.getPerformanceReport()
    const report = require('../utils/queryMonitor').getPerformanceReport();
    return successResponse(res, report);
  } catch (err) { return next(err); }
};
