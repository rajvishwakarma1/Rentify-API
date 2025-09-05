const { Property, City } = require('../models');
const { logger } = require('../utils/logger');
const { buildPagination, buildSort } = require('../utils/modelHelpers');
const { successResponse } = require('../utils/responseHelpers');
const { invalidatePropertyCaches, invalidateFilterCaches } = require('../utils/cacheInvalidation');

function buildFilterFromQuery(q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.cityId) filter.city = q.cityId;
  if (q.type) filter.type = q.type;
  if (q.minPrice != null || q.maxPrice != null) {
    filter['pricing.dailyRate'] = {};
    if (q.minPrice != null) filter['pricing.dailyRate'].$gte = Number(q.minPrice);
    if (q.maxPrice != null) filter['pricing.dailyRate'].$lte = Number(q.maxPrice);
  }
  return filter;
}

function escapeRegExp(s = '') { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

exports.getAllProperties = async (req, res, next) => {
  try {
    const defaultCountry = process.env.DEFAULT_COUNTRY;
  const { page, limit, skip } = buildPagination(req.query);
    const sort = buildSort(req.query.sort);
    const filter = buildFilterFromQuery(req.query);

  const appliedLimit = hardMax ? Math.min(limit, hardMax) : limit;
  let query = Property.find(filter).sort(sort).limit(appliedLimit).skip(skip).populate('city');
    if (defaultCountry && !req.query.cityId) {
      // Restrict by country through populated city
      query = query.where({}).populate({ path: 'city', match: { country: defaultCountry } });
    }
    if (req.query.q) query.find({ $text: { $search: req.query.q } });

    const [itemsRaw, totalRaw] = await Promise.all([
      query.lean(),
      Property.countDocuments({ ...(req.query.q ? { $text: { $search: req.query.q } } : {}), ...filter }),
    ]);
    const items = defaultCountry ? itemsRaw.filter(doc => doc.city && doc.city.country === defaultCountry) : itemsRaw;
    const total = defaultCountry ? items.length : totalRaw;

    return successResponse(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/properties/city/:name and variants:
// - /api/v1/properties/city/:name/under/:maxPrice
// - /api/v1/properties/city/:name/max/:max
// - /api/v1/properties/city/:name/under/:maxPrice/max/:max
exports.getPropertiesByCityName = async (req, res, next) => {
  try {
    const defaultCountry = process.env.DEFAULT_COUNTRY;
  const { name, maxPrice, max } = req.params;
    const cityMatch = { name: new RegExp(`^${escapeRegExp(decodeURIComponent(name))}$`, 'i') };
    if (defaultCountry) cityMatch.country = defaultCountry;

    const city = await City.findOne(cityMatch).lean();
    if (!city) { const e = new Error('City not found'); e.status = 404; throw e; }

    const { page, limit, skip } = buildPagination(req.query);
    const sort = buildSort(req.query.sort);
    const filter = { ...buildFilterFromQuery(req.query), city: city._id };
    const under = maxPrice ?? req.query.maxPrice ?? req.query.under;
    if (under != null) {
      filter['pricing.dailyRate'] = { ...(filter['pricing.dailyRate'] || {}), $lte: Number(under) };
    }
    // Optional hard max count from params or query (e.g., /max/10 or ?max=10)
    const hardMax = Number.isFinite(Number(max)) && Number(max) > 0
      ? Number(max)
      : (Number.isFinite(Number(req.query.max)) && Number(req.query.max) > 0 ? Number(req.query.max) : undefined);

    let query = Property.find(filter).sort(sort).limit(limit).skip(skip).populate('city');
    if (req.query.q) query = query.find({ $text: { $search: req.query.q } });

    const [itemsRaw, total] = await Promise.all([
      query.lean(),
      Property.countDocuments({ ...(req.query.q ? { $text: { $search: req.query.q } } : {}), ...filter }),
    ]);
    const items = hardMax ? itemsRaw.slice(0, hardMax) : itemsRaw;
    return successResponse(res, items, { page, limit, total, max: hardMax });
  } catch (err) { return next(err); }
};

exports.getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Property.findById(id).populate('city').lean();
    if (!doc) {
      const error = new Error('Property not found');
      error.status = 404; throw error;
    }
    return successResponse(res, doc);
  } catch (err) {
    return next(err);
  }
};

exports.createProperty = async (req, res, next) => {
  try {
    const payload = req.body;
    const city = await City.findById(payload.city);
    if (!city) { const e = new Error('Invalid city'); e.status = 400; throw e; }
    if (!payload.address) payload.address = {};
    payload.address.cityText = city.name;
  const created = await Property.create(payload);
    const doc = await Property.findById(created._id).populate('city').lean();
    logger.info('Property created', { id: created._id });
  // Invalidate cache for filters and searches in this city
  await invalidatePropertyCaches(created._id, created.city?.toString?.());
  await invalidateFilterCaches();
    return successResponse(res, doc, undefined, 201);
  } catch (err) {
    return next(err);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.city) {
      const city = await City.findById(updates.city);
      if (!city) { const e = new Error('Invalid city'); e.status = 400; throw e; }
      updates['address.cityText'] = city.name;
    }
  const doc = await Property.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).populate('city').lean();
    if (!doc) { const e = new Error('Property not found'); e.status = 404; throw e; }
    logger.info('Property updated', { id });
  await invalidatePropertyCaches(id, doc.city?._id?.toString?.());
  await invalidateFilterCaches();
    return successResponse(res, doc);
  } catch (err) {
    return next(err);
  }
};

exports.deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hard = String(req.query.hard || '').toLowerCase() === 'true';
    let result;
  if (hard) {
      result = await Property.findByIdAndDelete(id);
    } else {
      result = await Property.findByIdAndUpdate(id, { status: 'inactive' }, { new: true }).lean();
    }
    if (!result) { const e = new Error('Property not found'); e.status = 404; throw e; }
    logger.info('Property deleted', { id, hard });
  await invalidatePropertyCaches(id, result.city?._id?.toString?.() || result.city?.toString?.());
  await invalidateFilterCaches();
    return successResponse(res, { id, hard });
  } catch (err) {
    return next(err);
  }
};
