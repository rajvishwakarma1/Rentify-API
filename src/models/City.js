const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const CitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    state: { type: String, trim: true }, // State/Province
    timezone: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        // [lng, lat]
        type: [Number],
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number'),
          message: 'location.coordinates must be [lng, lat] numbers',
        },
      },
    },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound unique index for (name, country)
CitySchema.index({ name: 1, country: 1 }, { unique: true });
// Geospatial index
CitySchema.index({ location: '2dsphere' });

// Virtuals
CitySchema.virtual('displayName').get(function displayName() {
  return [this.name, this.state, this.country].filter(Boolean).join(', ');
});

// Statics
CitySchema.statics.findByName = function findByName(name) {
  return this.find({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
};

CitySchema.statics.findByCountry = function findByCountry(country) {
  return this.find({ country: new RegExp(`^${escapeRegex(country)}$`, 'i') });
};

CitySchema.statics.findNear = function findNear(lng, lat, maxDistanceMeters = 50000) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistanceMeters,
      },
    },
  });
};

CitySchema.post('save', (doc) => {
  logger.debug('City saved', { id: doc._id, name: doc.name });
});

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = mongoose.models.City || mongoose.model('City', CitySchema);
