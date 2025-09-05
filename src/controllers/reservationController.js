const { Reservation, Property } = require('../models');
const { logger } = require('../utils/logger');
const { buildPagination } = require('../utils/modelHelpers');
const { successResponse } = require('../utils/responseHelpers');
const { checkDateRangeAvailability, validateBookingRules, calculateBookingCost, generateAvailabilityCalendar } = require('../utils/availabilityHelpers');

exports.getAllReservations = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildPagination(req.query);
    const filter = {};
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.propertyId) filter.property = req.query.propertyId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.checkIn = { $lte: req.query.to ? new Date(req.query.to) : new Date('9999-12-31') };
      filter.checkOut = { $gte: req.query.from ? new Date(req.query.from) : new Date(0) };
    }
    const [items, total] = await Promise.all([
      Reservation.find(filter).populate('property user').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Reservation.countDocuments(filter),
    ]);
    return successResponse(res, items, { page, limit, total });
  } catch (err) { return next(err); }
};

exports.getReservationById = async (req, res, next) => {
  try {
    const doc = await Reservation.findById(req.params.id).populate('property user').lean();
    if (!doc) { const e = new Error('Reservation not found'); e.status = 404; throw e; }
    return successResponse(res, doc);
  } catch (err) { return next(err); }
};

exports.createReservation = async (req, res, next) => {
  try {
    const { propertyId, userId, checkIn, checkOut, guestCount, notes } = req.body;
    const property = await Property.findById(propertyId).lean();
    if (!property) { const e = new Error('Invalid property'); e.status = 400; throw e; }
    const rules = validateBookingRules(property, checkIn, checkOut, guestCount);
    if (!rules.ok) { const e = new Error(`Booking rule violation: ${rules.reason}`); e.status = 400; throw e; }
    const availability = await checkDateRangeAvailability(property, checkIn, checkOut);
    if (!availability.available) { const e = new Error('Dates not available'); e.status = 409; throw e; }
    const pricing = calculateBookingCost(property, rules.nights);
    const status = property.availability?.instantBook ? 'confirmed' : 'pending';
    const doc = await Reservation.create({ property: propertyId, user: userId, checkIn, checkOut, guestCount, notes, pricing, status });
    const populated = await Reservation.findById(doc._id).populate('property user').lean();
    logger.info('Reservation created', { id: doc._id });
    return successResponse(res, populated, undefined, 201);
  } catch (err) { return next(err); }
};

exports.updateReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const resv = await Reservation.findById(id).populate('property');
    if (!resv) { const e = new Error('Reservation not found'); e.status = 404; throw e; }
    // If dates or guestCount updated, revalidate
    const newCheckIn = updates.checkIn || resv.checkIn;
    const newCheckOut = updates.checkOut || resv.checkOut;
    const newGuestCount = updates.guestCount || resv.guestCount;
    const rules = validateBookingRules(resv.property, newCheckIn, newCheckOut, newGuestCount);
    if (!rules.ok) { const e = new Error(`Booking rule violation: ${rules.reason}`); e.status = 400; throw e; }
    const availability = await checkDateRangeAvailability(resv.property, newCheckIn, newCheckOut, resv._id);
    if (!availability.available) { const e = new Error('Dates not available'); e.status = 409; throw e; }
    // Apply
    Object.assign(resv, updates);
    resv.pricing = calculateBookingCost(resv.property, rules.nights);
    await resv.save();
    const populated = await Reservation.findById(id).populate('property user').lean();
    logger.info('Reservation updated', { id });
    return successResponse(res, populated);
  } catch (err) { return next(err); }
};

exports.cancelReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Reservation.findByIdAndUpdate(id, { status: 'cancelled', paymentStatus: 'refunded' }, { new: true }).lean();
    if (!doc) { const e = new Error('Reservation not found'); e.status = 404; throw e; }
    logger.info('Reservation cancelled', { id });
    return successResponse(res, doc);
  } catch (err) { return next(err); }
};

exports.getPropertyAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { checkIn, checkOut } = req.query;
    const property = await Property.findById(propertyId).lean();
    if (!property) { const e = new Error('Invalid property'); e.status = 400; throw e; }
    const availability = await checkDateRangeAvailability(property, checkIn, checkOut);
    return successResponse(res, availability);
  } catch (err) { return next(err); }
};

exports.getUserReservations = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildPagination(req.query);
    const { userId } = req.params;
    const [items, total] = await Promise.all([
      Reservation.find({ user: userId }).populate('property user').sort({ checkIn: -1 }).skip(skip).limit(limit).lean(),
      Reservation.countDocuments({ user: userId }),
    ]);
    return successResponse(res, items, { page, limit, total });
  } catch (err) { return next(err); }
};

exports.getPropertyCalendar = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { from, to } = req.query;
    const cal = await generateAvailabilityCalendar(propertyId, from, to);
    return successResponse(res, cal);
  } catch (err) { return next(err); }
};
