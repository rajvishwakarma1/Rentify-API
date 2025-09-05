const express = require('express');
const { validate } = require('../middleware/validation');
const { advancedSearchSchema, nearbySearchSchema, amenitySearchSchema } = require('../validation/searchValidation');
const ctrl = require('../controllers/searchController');

const router = express.Router();

router.get('/', validate(advancedSearchSchema, 'query'), ctrl.searchProperties);
router.get('/nearby', validate(nearbySearchSchema, 'query'), ctrl.searchNearby);
router.get('/amenities', validate(amenitySearchSchema, 'query'), ctrl.searchByAmenities);
router.get('/filters', (req, res, next) => { res.set('Cache-Control', 'public, max-age=300'); return next(); }, ctrl.getSearchFilters);

module.exports = router;
