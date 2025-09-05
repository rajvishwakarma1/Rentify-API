const express = require('express');
const { validate } = require('../middleware/validation');
const ctrl = require('../controllers/importController');
const Joi = require('joi');

const router = express.Router();

const urlsSchema = Joi.object({
  urls: Joi.array().items(Joi.string().uri().required()).min(1).required(),
  max_items_per_url: Joi.number().integer().min(1).max(100).default(20),
  cityName: Joi.string().min(2).max(100).optional(),
});

const detailUrlsSchema = Joi.object({
  urls: Joi.array().items(Joi.string().uri().required()).min(1).required(),
  cityName: Joi.string().min(2).max(100).optional(),
});

router.post('/housing-search', validate(urlsSchema, 'body'), ctrl.housingSearch);
router.post('/magicbricks-details', validate(detailUrlsSchema, 'body'), ctrl.magicbricksDetails);

module.exports = router;
