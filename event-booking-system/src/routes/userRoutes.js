const { Router } = require('express');
const { param } = require('express-validator');
const { getUserBookings } = require('../controllers/bookingController');
const { validate } = require('../middleware/errorHandler');

const router = Router();

// GET /users/:id/bookings
router.get(
  '/:id/bookings',
  [param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer.')],
  validate,
  getUserBookings
);

module.exports = router;
