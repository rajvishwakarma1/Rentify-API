const mongoose = require('mongoose');
const { Schema } = mongoose;

const reservationSchema = new Schema({
  property: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  guest: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  pricing: {
    baseAmount: Number,
    taxes: Number,
    fees: Number,
    totalAmount: Number,
    currency: { type: String, default: 'INR' }
  },
  payment: {
    method: String,
    transactionId: String,
    status: String,
    timestamps: Date
  },
  cancellation: {
    reason: String,
    refundAmount: Number,
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  specialRequests: String,
  confirmationCode: { type: String, unique: true },
  nights: Number
}, { timestamps: true });


// Validation: date range, guest capacity, overlap, host match
reservationSchema.pre('validate', async function(next) {
  try {
    // Check date range
    if (!this.checkIn || !this.checkOut) {
      return next(new Error('Both checkIn and checkOut are required.'));
    }
    if (this.checkIn >= this.checkOut) {
      return next(new Error('checkOut must be after checkIn.'));
    }
    // Check property exists and guest capacity, and host match
    const property = await this.model('Property').findById(this.property).select('host capacity.guests').lean();
    if (!property) {
      return next(new Error('Property does not exist.'));
    }
    if (!this.host) this.host = property.host;
    else if (String(this.host) !== String(property.host)) {
      return next(new Error('Reservation host must match property host.'));
    }
    if (typeof property.capacity?.guests === 'number' && this.guests > property.capacity.guests) {
      return next(new Error(`Guest count exceeds property capacity (${property.capacity.guests}).`));
    }
    // Check for overlapping reservations
    const overlap = await this.model('Reservation').exists({
      _id: { $ne: this._id },
      property: this.property,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: this.checkOut },
      checkOut: { $gt: this.checkIn }
    });
    if (overlap) {
      return next(new Error('Overlapping reservation exists for this property and date range.'));
    }
    next();
  } catch (err) {
    next(err);
  }
});

reservationSchema.index(
  { property: 1, checkIn: 1, checkOut: 1 },
  { partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);
reservationSchema.index({ guest: 1, status: 1 });
reservationSchema.index({ host: 1, status: 1 });
reservationSchema.index({ confirmationCode: 1 }, { unique: true });

reservationSchema.virtual('duration').get(function() {
  if (this.checkIn && this.checkOut) {
    return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

reservationSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    this.nights = Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
  }
  if (!this.confirmationCode) {
    this.confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
