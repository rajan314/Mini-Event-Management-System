const { Router } = require('express');
const { body } = require('express-validator');
const { createBooking } = require('../controllers/bookingController');
const { validate } = require('../middleware/errorHandler');

const router = Router();

// POST /bookings
router.post(
  '/',
  [
    body('user_id')
      .notEmpty().withMessage('user_id is required.')
      .isInt({ min: 1 }).withMessage('user_id must be a positive integer.'),
    body('event_id')
      .notEmpty().withMessage('event_id is required.')
      .isInt({ min: 1 }).withMessage('event_id must be a positive integer.'),
    body('tickets_count')
      .optional()
      .isInt({ min: 1 }).withMessage('tickets_count must be a positive integer.'),
  ],
  validate,
  createBooking
);

module.exports = router;
