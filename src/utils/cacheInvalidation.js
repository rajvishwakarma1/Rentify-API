const cache = require('./cache');
const { logger } = require('./logger');

async function invalidatePropertyCaches(propertyId, cityId) {
  await cache.connect();
  const patterns = [
    'filters:all',
    `search:properties:*cityId:${cityId || ''}*`,
    `search:nearby:*`,
    `analytics:*`,
  ];
  for (const p of patterns) { await cache.invalidatePattern(p); }
  logger.info('Invalidated property caches', { propertyId, cityId });
}

async function invalidateSearchCaches(cityId, priceRange, amenities) {
  await cache.connect();
  const patterns = [
    `search:properties:*cityId:${cityId || ''}*`,
    `search:properties:*minPrice:${priceRange?.min || ''}*`,
    `search:properties:*maxPrice:${priceRange?.max || ''}*`,
    `search:properties:*amenities:${Array.isArray(amenities) ? amenities.join('|') : ''}*`,
  ];
  for (const p of patterns) { await cache.invalidatePattern(p); }
}

async function invalidateFilterCaches() {
  await cache.connect();
  await cache.invalidatePattern('filters:*');
}

async function scheduleWarmup(cacheKeys = []) {
  // Placeholder: a background job could pre-fill these
  logger.info('Schedule cache warmup', { count: cacheKeys.length });
}

module.exports = { invalidatePropertyCaches, invalidateSearchCaches, invalidateFilterCaches, scheduleWarmup };
