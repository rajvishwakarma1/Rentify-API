// Reservations Controller
const { Reservation, Property } = require('../models');
const mongoose = require('mongoose');

// List reservations
exports.getReservations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'guest') filter.guest = req.user.sub;
    if (req.user.role === 'host') filter.host = req.user.sub;
    if (req.query.property) filter.property = req.query.property;
    if (req.query.status) filter.status = req.query.status;
    const reservations = await Reservation.find(filter).populate('property guest host');
    res.json(reservations);
  } catch (err) { next(err); }
};

// Get reservation by ID
exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('property guest host');
    if (!reservation) return res.status(404).json({ message: 'Reservation not found', requestId: req.id });
    if (String(reservation.guest) !== req.user.sub && String(reservation.host) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden', requestId: req.id });
    }
    res.json(reservation);
  } catch (err) { next(err); }
};

// Create reservation
exports.createReservation = async (req, res, next) => {
  try {
    const guest = req.user && req.user.sub;
    if (!guest) return res.status(401).json({ message: 'Unauthorized', requestId: req.id });
    const { property: propertyId, checkIn, checkOut, guests } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found', requestId: req.id });
    const available = await property.isAvailable(checkIn, checkOut);
    if (!available) return res.status(409).json({ message: 'Property not available for selected dates', requestId: req.id });
    const reservation = new Reservation({ ...req.body, guest, host: property.host });
    await reservation.save();
    res.status(201).json(reservation);
  } catch (err) { next(err); }
};

// Update reservation
exports.updateReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found', requestId: req.id });
    if (String(reservation.guest) !== req.user.sub && String(reservation.host) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden', requestId: req.id });
    }
    Object.assign(reservation, req.body);
    await reservation.save();
    res.json(reservation);
  } catch (err) { next(err); }
};

// Cancel reservation
exports.cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found', requestId: req.id });
    if (String(reservation.guest) !== req.user.sub && String(reservation.host) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden', requestId: req.id });
    }
    reservation.status = 'cancelled';
    await reservation.save();
    res.status(204).end();
  } catch (err) { next(err); }
};

// Check property availability
exports.getPropertyAvailability = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found', requestId: req.id });
    const { checkIn, checkOut } = req.query;
    const available = await property.isAvailable(checkIn, checkOut);
    res.json({ available });
  } catch (err) { next(err); }
};

// Get property calendar
exports.getPropertyCalendar = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found', requestId: req.id });

    // Find all confirmed or pending reservations for this property
    const reservations = await Reservation.find({
      property: property._id,
      status: { $in: ['pending', 'confirmed'] }
    }, 'checkIn checkOut status');

    // Build a set of all booked dates
    const bookedDates = new Set();
    reservations.forEach(r => {
      const start = new Date(r.checkIn);
      const end = new Date(r.checkOut);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        bookedDates.add(d.toISOString().slice(0, 10));
      }
    });

    // Optionally, generate a calendar for the next 12 months
    const today = new Date();
    const calendar = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      calendar.push({
        date: iso,
        available: !bookedDates.has(iso)
      });
    }

    res.json({
      propertyId: property._id,
      calendar,
      booked: Array.from(bookedDates)
    });
  } catch (err) { next(err); }
};
