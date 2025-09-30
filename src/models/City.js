const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  country: { type: String, required: true, default: process.env.DEFAULT_COUNTRY || 'India' },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: v => Array.isArray(v) && v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: 'Coordinates must be [lng, lat] in valid ranges.'
      }
    }
  },
  timezone: { type: String },
  isActive: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

citySchema.index({ name: 1, state: 1 }, { unique: true });
citySchema.index({ coordinates: '2dsphere' });

citySchema.virtual('displayName').get(function() {
  return `${this.name}, ${this.state}`;
});

citySchema.pre('save', function(next) {
  this.name = this.name.trim();
  this.state = this.state.trim();
  next();
});

citySchema.statics.findNearby = function({ lng, lat, maxDistance = 10_000 }) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  });
};

citySchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

module.exports = mongoose.model('City', citySchema);
