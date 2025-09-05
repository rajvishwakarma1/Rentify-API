class PropertyQueryBuilder {
  constructor() { this.filter = {}; this.text = null; this.sort = null; this.geo = null; }
  addTextSearch(q) { if (q) this.text = String(q); return this; }
  addPriceRange(min, max) {
    if (min != null || max != null) {
      this.filter['pricing.dailyRate'] = {};
      if (min != null) this.filter['pricing.dailyRate'].$gte = Number(min);
      if (max != null) this.filter['pricing.dailyRate'].$lte = Number(max);
    }
    return this;
  }
  addLocationFilter(lat, lng, radius) {
    if (lat != null && lng != null) this.geo = { lat: Number(lat), lng: Number(lng), radius: radius != null ? Number(radius) : undefined };
    return this;
  }
  addAmenitiesFilter(amenities, all = true) {
    if (Array.isArray(amenities) && amenities.length) this.filter.amenities = all ? { $all: amenities } : { $in: amenities };
    return this;
  }
  addAvailabilityFilter({ instantBook, minNights, maxNights } = {}) {
    if (instantBook != null) this.filter['availability.instantBook'] = !!instantBook;
    if (minNights != null || maxNights != null) {
      this.filter['availability.minNights'] = { $gte: minNights != null ? Number(minNights) : 1 };
      if (maxNights != null) this.filter['availability.maxNights'] = { $lte: Number(maxNights) };
    }
    return this;
  }
  addCapacityFilter({ minBedrooms, minBathrooms, minGuests } = {}) {
    if (minBedrooms != null) this.filter['capacity.bedrooms'] = { ...(this.filter['capacity.bedrooms'] || {}), $gte: Number(minBedrooms) };
    if (minBathrooms != null) this.filter['capacity.bathrooms'] = { ...(this.filter['capacity.bathrooms'] || {}), $gte: Number(minBathrooms) };
    if (minGuests != null) this.filter['capacity.maxGuests'] = { ...(this.filter['capacity.maxGuests'] || {}), $gte: Number(minGuests) };
    return this;
  }
  setBasicFilters({ cityId, type, status = 'active' } = {}) {
    if (status) this.filter.status = status;
    if (cityId) this.filter.city = cityId;
    if (type) this.filter.type = type;
    return this;
  }
  setSort(sort) { if (sort) this.sort = sort; return this; }
  build() { return { text: this.text, filter: this.filter, geo: this.geo, sort: this.sort }; }
}

class SearchAggregationBuilder {
  constructor() { this.pipeline = []; }
  addGeoNear({ lat, lng, radius, query = {} }) {
    this.pipeline.push({ $geoNear: { near: { type: 'Point', coordinates: [Number(lng), Number(lat)] }, distanceField: 'distance', spherical: true, maxDistance: radius != null ? Number(radius) : undefined, query } });
    return this;
  }
  addMatch(match) { if (match && Object.keys(match).length) this.pipeline.push({ $match: match }); return this; }
  addSort(sort) { if (sort) this.pipeline.push({ $sort: sort }); return this; }
  addSkip(skip) { if (skip) this.pipeline.push({ $skip: Number(skip) }); return this; }
  addLimit(limit) { if (limit) this.pipeline.push({ $limit: Number(limit) }); return this; }
  build() { return this.pipeline; }
}

function buildGeoNearQuery({ lat, lng, radius, query }) {
  const b = new SearchAggregationBuilder();
  return b.addGeoNear({ lat, lng, radius, query }).build();
}

function buildAmenityMatchQuery(amenities, all = true) {
  if (!Array.isArray(amenities) || !amenities.length) return {};
  return { amenities: all ? { $all: amenities } : { $in: amenities } };
}

function buildAvailabilityQuery({ instantBook } = {}) {
  const q = {};
  if (instantBook != null) q['availability.instantBook'] = !!instantBook;
  return q;
}

function buildSortOptions({ distance, price, rating, relevance } = {}) {
  // Priority: explicit props in the order provided
  const sort = {};
  if (relevance) sort.score = { $meta: 'textScore' };
  if (distance) sort.distance = distance > 0 ? 1 : -1; // normally 1
  if (price) sort['pricing.dailyRate'] = price > 0 ? 1 : -1;
  if (rating) sort.rating = rating > 0 ? 1 : -1;
  return Object.keys(sort).length ? sort : undefined;
}

module.exports = {
  PropertyQueryBuilder,
  SearchAggregationBuilder,
  buildGeoNearQuery,
  buildAmenityMatchQuery,
  buildAvailabilityQuery,
  buildSortOptions,
};
