const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['apartment', 'house', 'villa', 'studio', 'room'],
    required: true
  },
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  address: {
    street: String,
    area: String,
    pincode: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        validate: {
          validator: v => Array.isArray(v) && v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'Coordinates must be [lng, lat] in valid ranges.'
        }
      }
    }
  },
  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    cleaningFee: { type: Number, min: 0 },
    securityDeposit: { type: Number, min: 0 }
  },
  capacity: {
    guests: { type: Number, min: 1, max: 50 },
    bedrooms: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    beds: { type: Number, min: 0, max: 50 }
  },
  amenities: [String],
  images: [{ url: String, isMain: Boolean }],
  availability: {
    calendar: mongoose.Schema.Types.Mixed,
    minStay: Number
  },
  rules: {
    houseRules: String,
    checkIn: String,
    checkOut: String
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'suspended'],
    default: 'draft'
  },
  ratings: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 }
  },
  isInstantBook: { type: Boolean, default: false }
}, { timestamps: true });

propertySchema.index({ city: 1, status: 1 });
propertySchema.index({ host: 1, status: 1 });
propertySchema.index({ 'address.location': '2dsphere' });
propertySchema.index({ title: 'text', description: 'text' });



propertySchema.methods.calculatePrice = function({ nights = 1 } = {}) {
  let total = (this.pricing.basePrice || 0) * nights;
  if (this.pricing.cleaningFee) total += this.pricing.cleaningFee;
  if (this.pricing.securityDeposit) total += this.pricing.securityDeposit;
  return total;
};

propertySchema.methods.isAvailable = async function(checkIn, checkOut) {
  // Returns true if no overlapping reservations exist for this property
  const Reservation = this.model('Reservation');
  const overlap = await Reservation.exists({
    property: this._id,
    status: { $in: ['pending', 'confirmed'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  });
  return !overlap;
};

propertySchema.statics.search = function(query) {
  // Implement search logic
  return this.find(query);
};

propertySchema.pre('save', function(next) {
  this.title = this.title.trim();
  next();
});

module.exports = mongoose.model('Property', propertySchema);
