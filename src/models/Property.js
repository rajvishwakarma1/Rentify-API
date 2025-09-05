const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const PropertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['apartment', 'house', 'condo', 'studio', 'villa', 'loft'], required: true },
    status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      cityText: { type: String }, // denormalized for quick display
      postalCode: { type: String },
      country: { type: String, required: true },
    },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number'),
          message: 'location.coordinates must be [lng, lat] numbers',
        },
      },
    },
    pricing: {
      dailyRate: { type: Number, required: true, min: 0 },
      cleaningFee: { type: Number, default: 0, min: 0 },
      securityDeposit: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'USD' },
    },
    capacity: {
      bedrooms: { type: Number, required: true, min: 0, max: 50 },
      bathrooms: { type: Number, required: true, min: 0, max: 50 },
      maxGuests: { type: Number, required: true, min: 1, max: 100 },
    },
    amenities: [{ type: String }],
    images: [{ url: { type: String, required: true }, caption: { type: String } }],
    availability: {
      instantBook: { type: Boolean, default: false },
      minNights: { type: Number, default: 1, min: 1 },
      maxNights: { type: Number, default: 365, min: 1 },
      blackoutDates: [{ type: Date }],
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

// Indexes
PropertySchema.index({ 'location': '2dsphere' });
PropertySchema.index({ 'pricing.dailyRate': 1 });
PropertySchema.index({ city: 1, status: 1 });
PropertySchema.index({ title: 'text', description: 'text', 'address.cityText': 'text' });
PropertySchema.index({ amenities: 1 });
PropertySchema.index({ city: 1, 'pricing.dailyRate': 1, type: 1 });
PropertySchema.index({ location: '2dsphere', 'pricing.dailyRate': 1 });
PropertySchema.index({ 'availability.instantBook': 1 });
PropertySchema.index({ status: 1, rating: -1, 'pricing.dailyRate': 1 });
PropertySchema.index({ city: 1, status: 1, 'availability.instantBook': 1, 'pricing.dailyRate': 1 });
PropertySchema.index({ status: 1, 'capacity.maxGuests': 1, 'pricing.dailyRate': 1 });
PropertySchema.index({ type: 1, status: 1, rating: -1 });
PropertySchema.index({ 'availability.blackoutDates': 1 }, { sparse: true });

// Virtuals
PropertySchema.virtual('isActive').get(function isActive() { return this.status === 'active'; });

// Statics
PropertySchema.statics.search = function search({ q, cityId, minPrice, maxPrice, type, status = 'active', amenities, instantBook, lat, lng, radius, limit = 20, skip = 0, sort }) {
  const filter = {};
  if (status) filter.status = status;
  if (cityId) filter.city = cityId;
  if (type) filter.type = type;
  if (instantBook != null) filter['availability.instantBook'] = !!instantBook;
  if (Array.isArray(amenities) && amenities.length) {
    filter.amenities = { $all: amenities };
  }
  if (minPrice != null || maxPrice != null) {
    filter['pricing.dailyRate'] = {};
    if (minPrice != null) filter['pricing.dailyRate'].$gte = Number(minPrice);
    if (maxPrice != null) filter['pricing.dailyRate'].$lte = Number(maxPrice);
  }
  const query = this.find(filter).limit(Number(limit)).skip(Number(skip));
  if (q) query.find({ $text: { $search: q } });
  if (lat != null && lng != null && radius != null) {
    query.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius),
        },
      },
    });
  }
  if (sort) query.sort(sort);
  return query;
};

PropertySchema.statics.near = function near(lng, lat, maxDistanceMeters = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistanceMeters,
      },
    },
  });
};

PropertySchema.statics.searchWithinRadius = function searchWithinRadius({ lat, lng, radius = 5000, filter = {}, limit = 20, skip = 0, sort }) {
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        distanceField: 'distance',
        spherical: true,
        maxDistance: Number(radius),
        query: filter,
      },
    },
    { $skip: Number(skip) },
    { $limit: Number(limit) },
  ];
  if (sort) pipeline.push({ $sort: sort }); else pipeline.push({ $sort: { distance: 1 } });
  return this.aggregate(pipeline);
};

PropertySchema.statics.searchByAmenities = function searchByAmenities({ amenities = [], all = true, filter = {}, limit = 20, skip = 0, sort }) {
  const match = { ...filter };
  if (Array.isArray(amenities) && amenities.length) {
    match.amenities = all ? { $all: amenities } : { $in: amenities };
  }
  const query = this.find(match).limit(Number(limit)).skip(Number(skip));
  if (sort) query.sort(sort);
  return query;
};

PropertySchema.statics.advancedSearch = function advancedSearch({ text, lat, lng, radius, amenities, instantBook, cityId, type, minPrice, maxPrice, limit = 20, skip = 0, sort }) {
  const filter = {};
  if (cityId) filter.city = cityId;
  if (type) filter.type = type;
  filter.status = 'active';
  if (instantBook != null) filter['availability.instantBook'] = !!instantBook;
  if (minPrice != null || maxPrice != null) {
    filter['pricing.dailyRate'] = {};
    if (minPrice != null) filter['pricing.dailyRate'].$gte = Number(minPrice);
    if (maxPrice != null) filter['pricing.dailyRate'].$lte = Number(maxPrice);
  }
  if (Array.isArray(amenities) && amenities.length) {
    filter.amenities = { $all: amenities };
  }

  if (lat != null && lng != null) {
    // Prefer aggregation with distance
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radius != null ? Number(radius) : undefined,
          query: text ? { ...filter, $text: { $search: text } } : filter,
        },
      },
      { $skip: Number(skip) },
      { $limit: Number(limit) },
      { $sort: sort || { distance: 1 } },
    ];
    return this.aggregate(pipeline);
  }

  // Non-geo query
  const find = this.find(text ? { ...filter, $text: { $search: text } } : filter).limit(Number(limit)).skip(Number(skip));
  if (sort) find.sort(sort);
  return find;
};

// Hooks
PropertySchema.post('save', (doc) => {
  logger.debug('Property saved', { id: doc._id, title: doc.title });
});

module.exports = mongoose.models.Property || mongoose.model('Property', PropertySchema);

// Analytics statics
PropertySchema.statics.getAnalytics = function getAnalytics({ cityId } = {}) {
  const match = { status: 'active', ...(cityId ? { city: cityId } : {}) };
  const pipeline = [
    { $match: match },
    { $group: {
      _id: { city: '$city', type: '$type' },
      count: { $sum: 1 },
      avgPrice: { $avg: '$pricing.dailyRate' },
      avgRating: { $avg: '$rating' },
    } },
    { $sort: { 'count': -1 } },
  ];
  return this.aggregate(pipeline);
};

PropertySchema.statics.getRevenueByCity = function getRevenueByCity() {
  // Placeholder revenue using dailyRate; actual revenue would join Reservations
  const pipeline = [
    { $match: { status: 'active' } },
    { $group: { _id: '$city', avgDailyRate: { $avg: '$pricing.dailyRate' }, properties: { $sum: 1 } } },
    { $sort: { properties: -1 } },
  ];
  return this.aggregate(pipeline);
};

PropertySchema.statics.getPopularAmenities = function getPopularAmenities({ cityId } = {}) {
  const pipeline = [
    { $match: { status: 'active', ...(cityId ? { city: cityId } : {}) } },
    { $unwind: '$amenities' },
    { $group: { _id: '$amenities', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    { $sort: { count: -1 } },
  ];
  return this.aggregate(pipeline);
};
