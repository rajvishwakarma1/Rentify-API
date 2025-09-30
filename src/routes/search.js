// Search route
const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validation');
const ctrl = require('../controllers/searchController');
const Joi = require('joi');

const searchQuerySchema = Joi.object({
	text: Joi.string().allow(''),
	city: Joi.string().allow(''),
	amenities: Joi.alternatives().try(
		Joi.array().items(Joi.string()),
		Joi.string()
	),
	minPrice: Joi.number().min(0),
	maxPrice: Joi.number().min(0),
	guests: Joi.number().min(1),
	bedrooms: Joi.number().min(0),
	bathrooms: Joi.number().min(0),
	lat: Joi.number().min(-90).max(90),
	lng: Joi.number().min(-180).max(180),
	radius: Joi.number().min(0),
	type: Joi.string().valid('apartment', 'house', 'villa', 'studio', 'room'),
	minRating: Joi.number().min(0).max(5),
	sort: Joi.string(),
	limit: Joi.number().integer().min(1).max(100).default(20),
	page: Joi.number().integer().min(1).default(1)
});

// GET /search
router.get('/', validate(searchQuerySchema, 'query'), ctrl.searchProperties);

module.exports = router;
