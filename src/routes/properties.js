const express = require('express');
const { validate } = require('../middleware/validation');
const ctrl = require('../controllers/propertyController');
const { createPropertySchema, updatePropertySchema, queryPropertySchema, idSchema, cityNameParamSchema, cityNameWithPriceParamSchema, cityNameWithMaxParamSchema, cityNameWithPriceAndMaxParamSchema } = require('../validation/propertyValidation');
const { logger } = require('../utils/logger');

const router = express.Router();

// simple route-level logger
router.use((req, res, next) => {
  logger.info('Properties route hit', { method: req.method, path: req.originalUrl });
  next();
});

router.get('/', validate(queryPropertySchema, 'query'), ctrl.getAllProperties);
// Simple city-name endpoints: /city/:name and /city/:name/under/:maxPrice
// Also support optional max results in the path: /city/:name/max/:max and /city/:name/under/:maxPrice/max/:max
// Define the more specific routes first to ensure correct matching
router.get('/city/:name/under/:maxPrice/max/:max', validate(cityNameWithPriceAndMaxParamSchema, 'params'), ctrl.getPropertiesByCityName);
router.get('/city/:name/max/:max', validate(cityNameWithMaxParamSchema, 'params'), ctrl.getPropertiesByCityName);
router.get('/city/:name/under/:maxPrice', validate(cityNameWithPriceParamSchema, 'params'), ctrl.getPropertiesByCityName);
router.get('/city/:name', validate(cityNameParamSchema, 'params'), ctrl.getPropertiesByCityName);
router.get('/:id', validate(idSchema, 'params'), ctrl.getPropertyById);
router.post('/', validate(createPropertySchema, 'body'), ctrl.createProperty);
router.put('/:id', validate(idSchema, 'params'), validate(updatePropertySchema, 'body'), ctrl.updateProperty);
router.delete('/:id', validate(idSchema, 'params'), ctrl.deleteProperty);

module.exports = router;
