// Reservations routes
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { validate, schemas } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/reservationsController');

// GET /reservations
router.get('/', verifyToken, ctrl.getReservations);
const idParamSchema = Joi.object({ id: schemas.objectId });
// GET /reservations/:id
router.get('/:id', verifyToken, validate(idParamSchema, 'params'), ctrl.getReservation);
const reservationPayloadSchema = Joi.object({
	property: schemas.objectId.required(),
	checkIn: Joi.date().iso().required(),
	checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
	guests: Joi.number().min(1).required(),
	status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed'),
	confirmationCode: Joi.string(),
	totalPrice: Joi.number(),
	notes: Joi.string().allow(''),
});
// POST /reservations
router.post('/', verifyToken, validate(reservationPayloadSchema), ctrl.createReservation);
// PUT /reservations/:id
router.put('/:id', validate(idParamSchema, 'params'), verifyToken, validate(reservationPayloadSchema), ctrl.updateReservation);
// DELETE /reservations/:id
router.delete('/:id', verifyToken, validate(idParamSchema, 'params'), ctrl.cancelReservation);
const availabilityQuerySchema = {
	params: Joi.object({ propertyId: schemas.objectId.required() }),
	query: Joi.object({
		checkIn: Joi.date().iso().required(),
		checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required()
	})
};
// GET /reservations/property/:propertyId/availability
router.get(
	'/property/:propertyId/availability',
	verifyToken,
	validate(availabilityQuerySchema),
	ctrl.getPropertyAvailability
);
// GET /reservations/property/:propertyId/calendar
router.get(
	'/property/:propertyId/calendar',
	verifyToken,
	validate({ params: Joi.object({ propertyId: schemas.objectId.required() }) }),
	ctrl.getPropertyCalendar
);

module.exports = router;
