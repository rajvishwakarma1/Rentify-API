const mongoose = require('mongoose');
const { logger } = require('./logger');

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch (e) {
    return null;
  }
}

function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
}

function buildPagination(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildSort(sortStr) {
  if (!sortStr) return { createdAt: -1 };
  const sort = {};
  for (const part of String(sortStr).split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const dir = trimmed.startsWith('-') ? -1 : 1;
    const field = trimmed.replace(/^[-+]/, '');
    sort[field] = dir;
  }
  return sort;
}

// Advanced helpers (optional)
function buildAdvancedPagination({ page, limit, lastId } = {}) {
  // Cursor-based if lastId provided; else fallback to page/limit
  if (lastId && isValidObjectId(lastId)) {
    return { cursor: lastId, limit: Math.min(100, Math.max(1, Number(limit) || 20)) };
  }
  const base = buildPagination({ page, limit });
  return { ...base };
}

function buildComplexSort(sortStr) {
  if (!sortStr) return undefined;
  // Accept aliases like distance, price, rating, relevance
  const out = {};
  const parts = String(sortStr).split(',');
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const dir = trimmed.startsWith('-') ? -1 : 1;
    const key = trimmed.replace(/^[\-+]/, '');
    switch (key) {
      case 'distance': out.distance = dir; break;
      case 'price': out['pricing.dailyRate'] = dir; break;
      case 'rating': out.rating = dir; break;
      case 'relevance': out.score = { $meta: 'textScore' }; break;
      default: out[key] = dir; break;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function buildDistanceSort(asc = true) { return { distance: asc ? 1 : -1 }; }
function buildRelevanceSort() { return { score: { $meta: 'textScore' } }; }

function calculateSearchMetrics(items = []) {
  const result = { count: items.length };
  let minPrice = Infinity, maxPrice = -Infinity, sumPrice = 0, priced = 0;
  let minDist = Infinity, maxDist = -Infinity;
  for (const it of items) {
    const price = it?.pricing?.dailyRate;
    if (typeof price === 'number') { priced++; sumPrice += price; if (price < minPrice) minPrice = price; if (price > maxPrice) maxPrice = price; }
    const dist = it?.distance;
    if (typeof dist === 'number') { if (dist < minDist) minDist = dist; if (dist > maxDist) maxDist = dist; }
  }
  if (priced) {
    result.price = { min: minPrice, max: maxPrice, avg: sumPrice / priced };
  }
  if (isFinite(minDist) && isFinite(maxDist)) {
    result.distance = { min: minDist, max: maxDist };
  }
  return result;
}

function formatSearchResults(items = []) {
  return items.map((it) => ({
    id: it._id,
    title: it.title,
    type: it.type,
    status: it.status,
    city: it.city,
    pricing: it.pricing,
    capacity: it.capacity,
    rating: it.rating,
    distance: it.distance,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  }));
}

function mongoErrorToHttp(err) {
  const isProd = process.env.NODE_ENV === 'production';
  const payload = { status: 500, message: 'Internal Server Error' };
  if (!err) return payload;
  if (err.code === 11000) {
    payload.status = 409; payload.message = 'Duplicate key';
  } else if (err.name === 'ValidationError') {
    payload.status = 400; payload.message = 'Validation error';
  } else if (err.name === 'CastError') {
    payload.status = 400; payload.message = `Invalid ${err.path}`;
  }
  if (!isProd) payload.details = err.message;
  logger.error(payload.message, { err: err.message });
  return payload;
}

module.exports = { toObjectId, isValidObjectId, buildPagination, buildSort, mongoErrorToHttp, buildAdvancedPagination, buildComplexSort, buildDistanceSort, buildRelevanceSort, calculateSearchMetrics, formatSearchResults };
