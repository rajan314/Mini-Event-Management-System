const { Router } = require('express');
const { body, param } = require('express-validator');
const { listEvents, createEvent, recordAttendance } = require('../controllers/eventController');
const { validate } = require('../middleware/errorHandler');

const router = Router();

// GET /events
router.get('/', listEvents);

// POST /events
router.post(
  '/',
  [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required.')
      .isLength({ max: 255 }).withMessage('Title must be at most 255 characters.'),
    body('description')
      .optional()
      .trim(),
    body('date')
      .notEmpty().withMessage('Date is required.')
      .isISO8601().withMessage('Date must be a valid ISO 8601 datetime (e.g. 2025-09-15T09:00:00).')
      .custom((value) => {
        if (new Date(value) <= new Date()) throw new Error('Event date must be in the future.');
        return true;
      }),
    body('capacity')
      .notEmpty().withMessage('Capacity is required.')
      .isInt({ min: 1 }).withMessage('Capacity must be a positive integer.'),
  ],
  validate,
  createEvent
);

// POST /events/:id/attendance
router.post(
  '/:id/attendance',
  [
    param('id').isInt({ min: 1 }).withMessage('Event ID must be a positive integer.'),
    body('booking_code')
      .trim()
      .notEmpty().withMessage('booking_code is required.')
      .isUUID(4).withMessage('booking_code must be a valid UUID v4.'),
  ],
  validate,
  recordAttendance
);

module.exports = router;
