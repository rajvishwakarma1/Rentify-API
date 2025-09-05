const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isProd = process.env.NODE_ENV === 'production';

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  const payload = {
    success: false,
    message,
    requestId: req.id,
  };

  // Joi validation errors
  if (err.isJoi) {
    status = 400;
    payload.type = 'ValidationError';
    payload.errors = err.details?.map(d => ({ message: d.message, path: d.path })) || [];
  }

  // Mongoose errors
  if (err.name === 'CastError') {
    status = 400;
    payload.type = 'CastError';
    payload.errors = [{ message: `Invalid ${err.path}: ${err.value}` }];
  } else if (err.name === 'ValidationError') {
    status = 400;
    payload.type = 'MongooseValidationError';
    payload.errors = Object.values(err.errors).map(e => ({ message: e.message, path: e.path }));
  } else if (err.code && err.code === 11000) {
    status = 409;
    payload.type = 'DuplicateKeyError';
    payload.errors = [{ message: 'Duplicate key', keyValue: err.keyValue }];
  }

  if (!isProd) {
    payload.stack = err.stack;
  }

  logger.error(message, { status, path: req.originalUrl });

  res.status(status).json(payload);
}

module.exports = errorHandler;
