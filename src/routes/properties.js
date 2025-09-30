// Properties routes
const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/propertiesController');
const mongoose = require('mongoose');

// GET /properties
router.get('/', ctrl.getProperties);
// GET /properties/city/:name
router.get('/city/:name', ctrl.getPropertiesByCity);
// GET /properties/city/:name/under/:price
router.get('/city/:name/under/:price', ctrl.getPropertiesUnderPrice);
const Joi = require('joi');
const idParamSchema = Joi.object({ id: schemas.objectId });
// GET /properties/:id
router.get('/:id', validate(idParamSchema, 'params'), ctrl.getProperty);
// POST /properties
const propertyPayloadSchema = Joi.object({
	title: Joi.string().trim().max(120).required(),
	description: Joi.string().required(),
	type: Joi.string().valid('apartment', 'house', 'villa', 'studio', 'room').required(),
	city: schemas.objectId,
	address: Joi.object({
		street: Joi.string().allow(''),
		area: Joi.string().allow(''),
		pincode: Joi.string().allow(''),
		location: Joi.object({
			type: Joi.string().valid('Point').default('Point'),
			coordinates: Joi.array().items(Joi.number()).length(2)
		})
	}),
	pricing: Joi.object({
		basePrice: Joi.number().min(0).required(),
		currency: Joi.string().default('INR'),
		cleaningFee: Joi.number().min(0),
		securityDeposit: Joi.number().min(0)
	}),
	capacity: Joi.object({
		guests: Joi.number().min(1).max(50),
		bedrooms: Joi.number().min(0).max(20),
		bathrooms: Joi.number().min(0).max(20),
		beds: Joi.number().min(0).max(50)
	}),
	amenities: Joi.array().items(Joi.string()),
	images: Joi.array().items(Joi.object({ url: Joi.string(), isMain: Joi.boolean() })),
	availability: Joi.object({
		calendar: Joi.any(),
		minStay: Joi.number()
	}),
	rules: Joi.object({
		houseRules: Joi.string().allow(''),
		checkIn: Joi.string().allow(''),
		checkOut: Joi.string().allow('')
	}),
	status: Joi.string().valid('draft', 'active', 'inactive', 'suspended'),
	ratings: Joi.object({
		average: Joi.number().min(0).max(5),
		count: Joi.number()
	}),
	isInstantBook: Joi.boolean()
});
router.post('/', verifyToken, validate(propertyPayloadSchema), ctrl.createProperty);
// PUT /properties/:id
const propertyUpdateSchema = propertyPayloadSchema.fork(
	Object.keys(propertyPayloadSchema.describe().keys),
	key => Joi.optional()
);
router.put('/:id', validate(idParamSchema, 'params'), verifyToken, validate(propertyUpdateSchema), ctrl.updateProperty);
// DELETE /properties/:id
router.delete('/:id', verifyToken, validate(idParamSchema, 'params'), ctrl.deleteProperty);

module.exports = router;
