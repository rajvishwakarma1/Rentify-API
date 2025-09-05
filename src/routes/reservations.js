const express = require('express');
const { validate } = require('../middleware/validation');
const ctrl = require('../controllers/reservationController');
const {
  reservationIdSchema,
  createReservationSchema,
  updateReservationSchema,
  queryReservationSchema,
  availabilityQuerySchema,
  propertyParamSchema,
  userParamSchema,
} = require('../validation/reservationValidation');

const router = express.Router();

router.get('/', validate(queryReservationSchema, 'query'), ctrl.getAllReservations);
router.get('/:id', validate(reservationIdSchema, 'params'), ctrl.getReservationById);
router.post('/', validate(createReservationSchema, 'body'), ctrl.createReservation);
router.put('/:id', validate(reservationIdSchema, 'params'), validate(updateReservationSchema, 'body'), ctrl.updateReservation);
router.delete('/:id', validate(reservationIdSchema, 'params'), ctrl.cancelReservation);

router.get('/user/:userId', validate(userParamSchema, 'params'), ctrl.getUserReservations);
router.get('/property/:propertyId/availability', validate(propertyParamSchema, 'params'), validate(availabilityQuerySchema, 'query'), ctrl.getPropertyAvailability);
router.get('/property/:propertyId/calendar', validate(propertyParamSchema, 'params'), ctrl.getPropertyCalendar);

module.exports = router;
