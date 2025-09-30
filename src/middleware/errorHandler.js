// Centralized error handling middleware for Express
// Handles Joi, JWT, MongoDB, and custom errors with structured logging and request ID integration

const logger = require('../utils/logger');
let isCelebrateError;
try { ({ isCelebrateError } = require('celebrate')); } catch (_) { isCelebrateError = null; }
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const mongoose = require('mongoose');

const isDupKey = (e) => (e && (e.code === 11000 || e.code === 11001));
function getStatusCode(err) {
  if (err.isJoi || (isCelebrateError && isCelebrateError(err))) return 400;
  if (err instanceof SyntaxError && 'body' in err) return 400;
  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) return 401;
  if (isDupKey(err)) return 409;
  if (err.name === 'ValidationError' && err instanceof mongoose.Error) return 400;
  if (err.statusCode) return err.statusCode;
  if (err.status) return err.status;
  return 500;
}


function formatJoiError(err) {
  if (!err.details) return err.message;
  return err.details.map(d => ({
    field: d.path.join('.'),
    message: d.message.replace(/['"]/g, '')
  }));
}

function formatCelebrateError(err) {
  if (!err.details || typeof err.details.forEach !== 'function') return err.message;
  // err.details is a Map; extract first available segment
  let detailsArr = [];
  for (const segment of ['body', 'query', 'params', 'headers']) {
    if (err.details.has(segment)) {
      const joiErr = err.details.get(segment);
      if (joiErr && joiErr.details) {
        detailsArr = joiErr.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, '')
        }));
        break;
      }
    }
  }
  return detailsArr.length ? detailsArr : err.message;
}

function formatMongoError(err) {
  if (err && (err.code === 11000 || err.code === 11001)) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    const keyVals = err.keyValue || {};
    return fields.map(f => ({
      field: f,
      message: `Duplicate value${keyVals[f] ? `: ${keyVals[f]}` : ''}`
    }));
  }
  if (err.errors) {
    return Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }
  return err.message;
}



function normalizeDetails(details) {
  if (!details) return undefined;
  if (Array.isArray(details)) {
    return details.map(d => typeof d === 'string' ? { message: d } : d);
  }
  if (typeof details === 'string') return [{ message: details }];
  if (typeof details === 'object') {
    // Map or object
    return Object.entries(details).map(([field, message]) => ({ field, message }));
  }
  return [{ message: String(details) }];
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const env = process.env.NODE_ENV || 'development';
  const requestId = req.id || req.headers['x-request-id'];
  // Map JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    err.status = 400;
    err.type = 'validation';
    err.message = 'Invalid JSON payload';
  }
  const status = getStatusCode(err);
  let errorResponse = {
    code: status,
    message: err.message || 'Internal Server Error',
    requestId
  };

  // Error type detection
  let isOperational = false;
  if (err.isJoi) {
    errorResponse.type = 'validation';
    errorResponse.details = normalizeDetails(formatJoiError(err));
    isOperational = true;
  } else if (isCelebrateError && isCelebrateError(err)) {
    errorResponse.type = 'validation';
    errorResponse.details = normalizeDetails(formatCelebrateError(err));
    isOperational = true;
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    errorResponse.type = 'auth';
    errorResponse.details = normalizeDetails(err.message);
    isOperational = true;
  } else if (isDupKey(err) || err.name === 'MongoServerError' || err.name === 'MongoError' || err instanceof mongoose.Error) {
    errorResponse.type = 'database';
    errorResponse.details = normalizeDetails(formatMongoError(err));
    isOperational = true;
  } else if (err.type) {
    errorResponse.type = err.type;
    errorResponse.details = normalizeDetails(err.details);
    isOperational = true;
  }

  if (env === 'development') {
    errorResponse.stack = err.stack;
    logger.error(errorResponse.message, { ...errorResponse, stack: err.stack });
  } else {
    // Hide details for non-operational 5xx errors
    if (status >= 500 && !isOperational) {
      errorResponse.message = 'Internal Server Error';
      delete errorResponse.details;
    }
    logger.error(errorResponse.message, errorResponse);
  }

  if (env !== 'development') delete errorResponse.stack;

  res.status(status).json(errorResponse);
}

// Helper for creating custom errors
function createError({ message, status = 500, type = 'application', details }) {
  const err = new Error(message);
  err.status = status;
  err.type = type;
  if (details) err.details = details;
  return err;
}

module.exports = {
  errorHandler,
  createError
};
