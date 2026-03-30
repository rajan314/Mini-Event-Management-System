const { validationResult } = require('express-validator');

/**
 * Runs express-validator checks and responds with 422 if any field is invalid.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * Central error handler – must be registered LAST in Express.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ success: false, message });
};

/**
 * 404 handler – register just before errorHandler.
 */
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};

module.exports = { validate, errorHandler, notFound };
