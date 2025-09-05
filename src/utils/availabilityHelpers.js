const { Reservation } = require('../models');
const { logger } = require('./logger');

function dateRangeOverlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

async function findConflictingReservations(propertyId, checkIn, checkOut, excludeId) {
  return Reservation.findConflictingReservations(propertyId, checkIn, checkOut, excludeId).lean();
}

async function checkDateRangeAvailability(property, checkIn, checkOut, excludeId) {
  const conflicts = await findConflictingReservations(property._id, checkIn, checkOut, excludeId);
  if (conflicts.length) return { available: false, reason: 'conflict', conflicts };
  const blackout = (property.availability?.blackoutDates || []).map((d) => new Date(d));
  const start = startOfDay(checkIn); const end = startOfDay(checkOut);
  if (blackout.some((d) => dateRangeOverlaps(start, end, startOfDay(d), addDays(startOfDay(d), 1)))) {
    return { available: false, reason: 'blackout' };
  }
  return { available: true };
}

function validateBookingRules(property, checkIn, checkOut, guestCount) {
  const nights = nightsBetween(checkIn, checkOut);
  const rules = property.availability || {};
  if (nights <= 0) return { ok: false, reason: 'duration' };
  if (rules.minNights && nights < rules.minNights) return { ok: false, reason: 'minNights', value: rules.minNights };
  if (rules.maxNights && nights > rules.maxNights) return { ok: false, reason: 'maxNights', value: rules.maxNights };
  if (property.capacity?.maxGuests && guestCount > property.capacity.maxGuests) return { ok: false, reason: 'capacity', value: property.capacity.maxGuests };
  return { ok: true, nights };
}

function calculateBookingCost(property, nights) {
  const nightlyRate = property.pricing?.dailyRate || 0;
  const cleaningFee = property.pricing?.cleaningFee || 0;
  const securityDeposit = property.pricing?.securityDeposit || 0;
  const taxes = 0;
  const currency = property.pricing?.currency || 'USD';
  const total = nightlyRate * nights + cleaningFee + securityDeposit + taxes;
  return { nightlyRate, cleaningFee, securityDeposit, taxes, currency, totalAmount: Math.round(total * 100) / 100 };
}

async function generateAvailabilityCalendar(propertyId, from, to) {
  const events = await Reservation.getPropertyCalendar(propertyId, from, to);
  return { propertyId, from, to, events };
}

function getNextAvailableDate(property, from) {
  // Naive implementation: if from date is blackout, move forward until not blackout
  const set = new Set((property.availability?.blackoutDates || []).map((d) => startOfDay(d).getTime()));
  let d = startOfDay(from);
  for (let i = 0; i < 365; i++) { if (!set.has(d.getTime())) return d; d = addDays(d, 1); }
  return null;
}

function getAvailableDateRanges(property, from, to) {
  // Placeholder: return continuous ranges excluding blackout dates
  const blackout = new Set((property.availability?.blackoutDates || []).map((d) => startOfDay(d).getTime()));
  const ranges = [];
  let curStart = null;
  for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) {
    if (blackout.has(d.getTime())) {
      if (curStart) { ranges.push({ start: curStart, end: d }); curStart = null; }
    } else if (!curStart) {
      curStart = new Date(d);
    }
  }
  if (curStart) ranges.push({ start: curStart, end: startOfDay(to) });
  return ranges;
}

function nightsBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n = 1) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

module.exports = {
  checkDateRangeAvailability,
  findConflictingReservations,
  generateAvailabilityCalendar,
  calculateBookingCost,
  validateBookingRules,
  getNextAvailableDate,
  getAvailableDateRanges,
};
