const Joi = require('joi');

const lat = Joi.number().min(-90).max(90);
const lng = Joi.number().min(-180).max(180);

const advancedSearchSchema = Joi.object({
  q: Joi.string().allow('', null),
  cityId: Joi.string().hex().length(24),
  type: Joi.string().valid('apartment', 'house', 'condo', 'studio', 'villa', 'loft'),
  status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  amenities: Joi.string().allow('', null), // CSV, parsed in controller
  instantBook: Joi.boolean(),
  minNights: Joi.number().integer().min(1),
  maxNights: Joi.number().integer().min(1),
  minBedrooms: Joi.number().integer().min(0),
  minBathrooms: Joi.number().integer().min(0),
  minGuests: Joi.number().integer().min(1),
  lat: lat,
  lng: lng,
  radius: Joi.number().integer().min(1).max(200000),
  sort: Joi.string().pattern(/^[a-zA-Z0-9_,\-+]+$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const nearbySearchSchema = Joi.object({
  lat: lat.required(),
  lng: lng.required(),
  radius: Joi.number().integer().min(1).max(200000).default(5000),
  sort: Joi.string().pattern(/^[a-zA-Z0-9_,\-+]+$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const amenitySearchSchema = Joi.object({
  amenities: Joi.string().required(),
  all: Joi.boolean().default(true),
  sort: Joi.string().pattern(/^[a-zA-Z0-9_,\-+]+$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { advancedSearchSchema, nearbySearchSchema, amenitySearchSchema };
