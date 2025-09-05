const { Property } = require('../models');
const { logger } = require('../utils/logger');
const { buildPagination, buildSort } = require('../utils/modelHelpers');
const { PropertyQueryBuilder, buildSortOptions } = require('../utils/queryBuilders');
const { successResponse } = require('../utils/responseHelpers');
const cache = require('../utils/cache');
const { wrapQuery } = require('../utils/queryMonitor');

exports.searchProperties = async (req, res, next) => {
  try {
  const defaultCountry = process.env.DEFAULT_COUNTRY;
    const { page, limit, skip } = buildPagination(req.query);
    // Sort can be a comma list; fallback to helper
    const sort = buildSort(req.query.sort) || buildSortOptions({ price: Number(req.query.sortPrice) });

    const qb = new PropertyQueryBuilder()
      .addTextSearch(req.query.q)
      .addPriceRange(req.query.minPrice, req.query.maxPrice)
      .addLocationFilter(req.query.lat, req.query.lng, req.query.radius)
      .addAmenitiesFilter(parseCsv(req.query.amenities))
      .addAvailabilityFilter({ instantBook: parseBool(req.query.instantBook), minNights: req.query.minNights, maxNights: req.query.maxNights })
      .addCapacityFilter({ minBedrooms: req.query.minBedrooms, minBathrooms: req.query.minBathrooms, minGuests: req.query.minGuests })
      .setBasicFilters({ cityId: req.query.cityId, type: req.query.type, status: req.query.status })
      .setSort(sort);

    const q = qb.build();

    if (q.geo) {
      const items = await Property.advancedSearch({ text: q.text, lat: q.geo.lat, lng: q.geo.lng, radius: q.geo.radius, amenities: undefined, instantBook: q.filter['availability.instantBook'], cityId: q.filter.city, type: q.filter.type, minPrice: q.filter['pricing.dailyRate']?.$gte, maxPrice: q.filter['pricing.dailyRate']?.$lte, limit, skip, sort: q.sort });
      // Can't reliably get total with geoNear without a second query; omit total in meta
      return successResponse(res, items, undefined);
    }

    let base = Property.search({ q: q.text, cityId: q.filter.city, minPrice: q.filter['pricing.dailyRate']?.$gte, maxPrice: q.filter['pricing.dailyRate']?.$lte, type: q.filter.type, status: q.filter.status, amenities: toArray(q.filter.amenities && q.filter.amenities.$all), instantBook: q.filter['availability.instantBook'], limit, skip, sort: q.sort }).populate('city');
    if (defaultCountry && !req.query.cityId) {
      base = base.populate({ path: 'city', match: { country: defaultCountry } });
    }
    const key = cache.buildCacheKey('search:properties', { ...req.query, page, limit });
    await cache.connect();
    const ttl = Number(process.env.CACHE_TTL_SEARCH || 60);
    const { items, total } = await cache.wrap(key, ttl, async () => {
      const [docsRaw, countRaw] = await Promise.all([
        wrapQuery(base.lean(), 'search:properties:list'),
        wrapQuery(Property.countDocuments({ ...(q.text ? { $text: { $search: q.text } } : {}), ...q.filter }), 'search:properties:count'),
      ]);
      const docs = defaultCountry ? docsRaw.filter(d => d.city && d.city.country === defaultCountry) : docsRaw;
      const count = defaultCountry ? docs.length : countRaw;
      return { items: docs, total: count };
    });
    return successResponse(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
};

exports.searchNearby = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildPagination(req.query);
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 5000);
    const sort = buildSort(req.query.sort) || { distance: 1 };
    const filter = { status: req.query.status || 'active' };
  await cache.connect();
  const key = cache.buildCacheKey('search:nearby', { lat, lng, radius, page, limit, sort });
  const ttl = Number(process.env.CACHE_TTL_SEARCH || 60);
  const items = await cache.wrap(key, ttl, async () => wrapQuery(Property.searchWithinRadius({ lat, lng, radius, filter, limit, skip, sort }), 'search:nearby'));
    return successResponse(res, items, undefined);
  } catch (err) {
    return next(err);
  }
};

exports.searchByAmenities = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildPagination(req.query);
    const amenities = parseCsv(req.query.amenities);
    const all = parseBool(req.query.all ?? 'true');
    const sort = buildSort(req.query.sort);
    const base = Property.searchByAmenities({ amenities, all, filter: { status: req.query.status || 'active' }, limit, skip, sort }).populate('city');
    const [items, total] = await Promise.all([
      base.lean(),
      Property.countDocuments({ status: req.query.status || 'active', ...(all ? { amenities: { $all: amenities } } : { amenities: { $in: amenities } }) }),
    ]);
    return successResponse(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
};

exports.getSearchFilters = async (req, res, next) => {
  try {
    await cache.connect();
    const key = 'filters:all';
    const ttl = Number(process.env.CACHE_TTL_FILTERS || 1800);
    const data = await cache.wrap(key, ttl, async () => {
      const [cities, priceAgg, amenityAgg] = await Promise.all([
        wrapQuery(Property.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$city', count: { $sum: 1 } } }]), 'filters:cities'),
        wrapQuery(Property.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, min: { $min: '$pricing.dailyRate' }, max: { $max: '$pricing.dailyRate' } } }]), 'filters:prices'),
        wrapQuery(Property.aggregate([{ $match: { status: 'active' } }, { $unwind: '$amenities' }, { $group: { _id: '$amenities', count: { $sum: 1 } } }, { $sort: { count: -1 } }]), 'filters:amenities'),
      ]);
      return { cities, priceRange: priceAgg[0] || null, amenities: amenityAgg };
    });
    return successResponse(res, data);
  } catch (err) {
    return next(err);
  }
};

function parseCsv(val) { if (!val) return []; return String(val).split(',').map(s => s.trim()).filter(Boolean); }
function parseBool(val) { if (val === true || val === false) return !!val; const s = String(val).toLowerCase(); return s === 'true' || s === '1' || s === 'yes'; }
function toArray(v) { return Array.isArray(v) ? v : v != null ? [v] : []; }
