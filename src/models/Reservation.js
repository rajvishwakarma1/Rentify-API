const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const ReservationSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guestCount: { type: Number, required: true, min: 1 },
    guestInfo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending', index: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
    paymentMethod: { type: String },
    paymentId: { type: String },
    pricing: {
      nightlyRate: { type: Number, required: true, min: 0 },
      cleaningFee: { type: Number, default: 0, min: 0 },
      securityDeposit: { type: Number, default: 0, min: 0 },
      taxes: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'USD' },
      totalAmount: { type: Number, required: true, min: 0 },
    },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

// Indexes for availability queries and user history
ReservationSchema.index({ property: 1, checkIn: 1, checkOut: 1 });
ReservationSchema.index({ user: 1, status: 1, checkIn: -1 });
ReservationSchema.index({ status: 1, checkIn: 1 });

// Validation hook for dates
ReservationSchema.pre('validate', function preValidate(next) {
  if (this.checkIn && this.checkOut && !(this.checkOut > this.checkIn)) {
    return next(new Error('checkOut must be after checkIn'));
  }
  return next();
});

// Instance helpers
ReservationSchema.methods.isActive = function isActive() {
  return this.status === 'pending' || this.status === 'confirmed';
};

ReservationSchema.methods.calculateTotal = function calculateTotal(nights) {
  const nightlyRate = this.pricing.nightlyRate || 0;
  const cleaningFee = this.pricing.cleaningFee || 0;
  const securityDeposit = this.pricing.securityDeposit || 0;
  const taxes = this.pricing.taxes || 0;
  const total = nightlyRate * nights + cleaningFee + securityDeposit + taxes;
  this.pricing.totalAmount = Math.max(0, Math.round(total * 100) / 100);
  return this.pricing.totalAmount;
};

// Statics
ReservationSchema.statics.findConflictingReservations = function findConflictingReservations(propertyId, checkIn, checkOut, excludeId) {
  const activeStatuses = ['pending', 'confirmed'];
  const q = {
    property: propertyId,
    status: { $in: activeStatuses },
    $and: [
      { checkIn: { $lt: new Date(checkOut) } },
      { checkOut: { $gt: new Date(checkIn) } },
    ],
  };
  if (excludeId) q._id = { $ne: excludeId };
  return this.find(q);
};

ReservationSchema.statics.checkAvailability = async function checkAvailability(property, checkIn, checkOut, excludeId) {
  const conflicts = await this.findConflictingReservations(property._id, checkIn, checkOut, excludeId);
  if (conflicts.length > 0) return { available: false, reason: 'conflict', conflicts };
  // blackout dates
  const blackoutDates = property?.availability?.blackoutDates || [];
  const inRange = (d) => d >= startOfDay(checkIn) && d < startOfDay(checkOut);
  if (blackoutDates.some((d) => inRange(new Date(d)))) {
    return { available: false, reason: 'blackout' };
  }
  return { available: true };
};

ReservationSchema.statics.getPropertyCalendar = async function getPropertyCalendar(propertyId, from, to) {
  const match = { property: propertyId, status: { $in: ['pending', 'confirmed'] }, checkIn: { $lt: new Date(to) }, checkOut: { $gt: new Date(from) } };
  const reservations = await this.find(match).select('checkIn checkOut').lean();
  return reservations.map((r) => ({ checkIn: r.checkIn, checkOut: r.checkOut }));
};

ReservationSchema.statics.createWithValidation = async function createWithValidation({ property, user, checkIn, checkOut, guestCount, notes }) {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) { const e = new Error('Invalid stay duration'); e.status = 400; throw e; }
  if (property.capacity?.maxGuests && guestCount > property.capacity.maxGuests) { const e = new Error('Guest count exceeds capacity'); e.status = 400; throw e; }
  const rules = property.availability || {};
  if (rules.minNights && nights < rules.minNights) { const e = new Error(`Minimum stay is ${rules.minNights} nights`); e.status = 400; throw e; }
  if (rules.maxNights && nights > rules.maxNights) { const e = new Error(`Maximum stay is ${rules.maxNights} nights`); e.status = 400; throw e; }

  const availability = await this.checkAvailability(property, checkIn, checkOut);
  if (!availability.available) { const e = new Error('Dates not available'); e.status = 409; throw e; }

  const nightlyRate = property.pricing?.dailyRate || 0;
  const cleaningFee = property.pricing?.cleaningFee || 0;
  const securityDeposit = property.pricing?.securityDeposit || 0;
  const currency = property.pricing?.currency || 'USD';
  const taxes = 0; // placeholder for tax computation
  const pricing = { nightlyRate, cleaningFee, securityDeposit, taxes, currency, totalAmount: nightlyRate * nights + cleaningFee + securityDeposit + taxes };
  const status = property.availability?.instantBook ? 'confirmed' : 'pending';
  const resv = await this.create({ property: property._id, user: user._id || user, checkIn, checkOut, guestCount, pricing, status, notes });
  logger.info('Reservation created', { id: resv._id, property: String(property._id) });
  return resv;
};

ReservationSchema.statics.cancelReservation = async function cancelReservation(id) {
  const doc = await this.findByIdAndUpdate(id, { status: 'cancelled', paymentStatus: 'refunded' }, { new: true });
  return doc;
};

// Utils
function nightsBetween(a, b) {
  const ms = startOfDay(b) - startOfDay(a);
  return Math.round(ms / 86400000);
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

ReservationSchema.post('save', (doc) => {
  logger.debug('Reservation saved', { id: doc._id });
});

module.exports = mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema);
 
// Analytics
/**
 * Aggregate revenue from reservations grouped by city and period.
 * @param {Object} params
 * @param {'daily'|'monthly'|'yearly'} [params.period='monthly'] - Time bucketing
 * @param {string|Date} [params.from] - ISO date (inclusive)
 * @param {string|Date} [params.to] - ISO date (exclusive)
 * @param {string|ObjectId} [params.cityId] - Filter by city id
 * @returns {AggregateCursor}
 */
ReservationSchema.statics.aggregateRevenue = function aggregateRevenue({ period = 'monthly', from, to, cityId } = {}) {
  const match = {
    // Consider only meaningful bookings
    status: { $in: ['confirmed', 'completed'] },
  };
  if (from || to) {
    match.checkIn = {};
    if (from) match.checkIn.$gte = new Date(from);
    if (to) match.checkIn.$lt = new Date(to);
  }

  let dateFormat = '%Y-%m';
  if (period === 'daily') dateFormat = '%Y-%m-%d';
  if (period === 'yearly') dateFormat = '%Y';

  const pipeline = [
    { $match: match },
    // Join properties to get city and pricing currency if needed
    { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'prop' } },
    { $unwind: '$prop' },
  ];

  if (cityId) {
    pipeline.push({ $match: { 'prop.city': new mongoose.Types.ObjectId(String(cityId)) } });
  }

  pipeline.push(
    {
      $addFields: {
        nights: {
          $ceil: {
            $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 86400000],
          },
        },
        period: { $dateToString: { format: dateFormat, date: '$checkIn' } },
        amount: { $ifNull: ['$pricing.totalAmount', 0] },
        currency: { $ifNull: ['$pricing.currency', 'USD'] },
      },
    },
    {
      $group: {
        _id: { city: '$prop.city', period: '$period', currency: '$currency' },
        reservations: { $sum: 1 },
        totalRevenue: { $sum: '$amount' },
        avgNights: { $avg: '$nights' },
      },
    },
    { $sort: { '_id.period': 1 } },
    // Optional: shape output
    {
      $project: {
        _id: 0,
        city: '$_id.city',
        period: '$_id.period',
        currency: '$_id.currency',
        reservations: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        avgNights: { $round: ['$avgNights', 2] },
      },
    }
  );

  return this.aggregate(pipeline);
};
