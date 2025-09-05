const Joi = require('joi');
const { patterns } = require('../middleware/validation');

const propertyAnalyticsSchema = Joi.object({
  cityId: patterns.id(),
});

const revenueAnalyticsSchema = Joi.object({
  period: Joi.string().valid('daily', 'monthly', 'yearly').default('monthly'),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  cityId: patterns.id(),
});

const amenityAnalyticsSchema = Joi.object({
  cityId: patterns.id(),
});

const cityAnalyticsSchema = Joi.object({
  cityId: patterns.id(),
});

const performanceAnalyticsSchema = Joi.object({});

module.exports = {
  propertyAnalyticsSchema,
  revenueAnalyticsSchema,
  amenityAnalyticsSchema,
  cityAnalyticsSchema,
  performanceAnalyticsSchema,
};
