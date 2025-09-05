const Joi = require('joi');
const { patterns } = require('../middleware/validation');

const isoDate = Joi.date().iso();

const reservationIdSchema = Joi.object({ id: patterns.id().required() });

const createReservationSchema = Joi.object({
  propertyId: patterns.id().required(),
  userId: patterns.id().required(),
  checkIn: isoDate.required(),
  checkOut: isoDate.required(),
  guestCount: Joi.number().integer().min(1).required(),
  guestInfo: Joi.object({ name: Joi.string().max(120), email: Joi.string().email(), phone: Joi.string().max(30) }).default({}),
  notes: Joi.string().max(2000).allow('', null),
}).custom((value, helpers) => {
  if (!(new Date(value.checkOut) > new Date(value.checkIn))) return helpers.error('any.invalid', { message: 'checkOut must be after checkIn' });
  return value;
});

const updateReservationSchema = Joi.object({
  checkIn: isoDate,
  checkOut: isoDate,
  guestCount: Joi.number().integer().min(1),
  notes: Joi.string().max(2000).allow('', null),
}).min(1);

const queryReservationSchema = Joi.object({
  propertyId: patterns.id(),
  userId: patterns.id(),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed'),
  from: isoDate,
  to: isoDate,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const availabilityQuerySchema = Joi.object({
  checkIn: isoDate.required(),
  checkOut: isoDate.required(),
}).custom((v, h) => {
  if (!(new Date(v.checkOut) > new Date(v.checkIn))) return h.error('any.invalid', { message: 'checkOut must be after checkIn' });
  return v;
});

const propertyParamSchema = Joi.object({ propertyId: patterns.id().required() });
const userParamSchema = Joi.object({ userId: patterns.id().required() });

module.exports = {
  reservationIdSchema,
  createReservationSchema,
  updateReservationSchema,
  queryReservationSchema,
  availabilityQuerySchema,
  propertyParamSchema,
  userParamSchema,
};
