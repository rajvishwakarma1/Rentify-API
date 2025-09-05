const Joi = require('joi');
const { patterns } = require('../middleware/validation');

const coordinate = Joi.number().min(-180).max(180);
const lat = Joi.number().min(-90).max(90);
const lng = Joi.number().min(-180).max(180);

const idSchema = Joi.object({ id: patterns.id().required() });

const addressSchema = Joi.object({
  line1: Joi.string().min(1).max(200).required(),
  line2: Joi.string().max(200).allow('', null),
  cityText: Joi.string().max(120).allow('', null),
  postalCode: Joi.string().max(20).allow('', null),
  country: Joi.string().min(2).max(100).required(),
});

const locationSchema = Joi.object({
  type: Joi.string().valid('Point').default('Point'),
  coordinates: Joi.array().ordered(lng.required(), lat.required()).length(2).required(),
});

const pricingSchema = Joi.object({
  dailyRate: Joi.number().min(0).required(),
  cleaningFee: Joi.number().min(0).default(0),
  securityDeposit: Joi.number().min(0).default(0),
  currency: Joi.string().length(3).uppercase().default('USD'),
});

const capacitySchema = Joi.object({
  bedrooms: Joi.number().integer().min(0).max(50).required(),
  bathrooms: Joi.number().integer().min(0).max(50).required(),
  maxGuests: Joi.number().integer().min(1).max(100).required(),
});

const availabilitySchema = Joi.object({
  instantBook: Joi.boolean().default(false),
  minNights: Joi.number().integer().min(1).default(1),
  maxNights: Joi.number().integer().min(1).default(365),
  blackoutDates: Joi.array().items(Joi.date()),
});

const baseProperty = {
  title: Joi.string().min(3).max(140),
  description: Joi.string().max(5000).allow('', null),
  type: Joi.string().valid('apartment', 'house', 'condo', 'studio', 'villa', 'loft'),
  status: Joi.string().valid('active', 'inactive', 'draft'),
  address: addressSchema,
  city: patterns.id(),
  location: locationSchema,
  pricing: pricingSchema,
  capacity: capacitySchema,
  amenities: Joi.array().items(Joi.string().trim()).default([]),
  images: Joi.array().items(Joi.object({ url: Joi.string().uri().required(), caption: Joi.string().allow('', null) })).default([]),
  availability: availabilitySchema,
  rating: Joi.number().min(0).max(5),
};

const createPropertySchema = Joi.object({
  ...baseProperty,
  title: baseProperty.title.required(),
  type: baseProperty.type.required(),
  address: baseProperty.address.required(),
  city: baseProperty.city.required(),
  location: baseProperty.location.required(),
  pricing: baseProperty.pricing.required(),
  capacity: baseProperty.capacity.required(),
}).required();

const updatePropertySchema = Joi.object(baseProperty).min(1);

const queryPropertySchema = Joi.object({
  q: Joi.string().allow('', null),
  cityId: patterns.id(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  type: baseProperty.type,
  status: baseProperty.status.default('active'),
  sort: Joi.string().pattern(/^[a-zA-Z0-9_,\-+]+$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
const cityNameParamSchema = Joi.object({ name: Joi.string().trim().min(2).max(100).required() });
const cityNameWithPriceParamSchema = Joi.object({ name: Joi.string().trim().min(2).max(100).required(), maxPrice: Joi.number().integer().min(0).required() });
const cityNameWithMaxParamSchema = Joi.object({ name: Joi.string().trim().min(2).max(100).required(), max: Joi.number().integer().min(1).max(1000).required() });
const cityNameWithPriceAndMaxParamSchema = Joi.object({ name: Joi.string().trim().min(2).max(100).required(), maxPrice: Joi.number().integer().min(0).required(), max: Joi.number().integer().min(1).max(1000).required() });

module.exports = { createPropertySchema, updatePropertySchema, queryPropertySchema, idSchema, cityNameParamSchema, cityNameWithPriceParamSchema, cityNameWithMaxParamSchema, cityNameWithPriceAndMaxParamSchema };
