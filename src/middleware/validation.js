
// Joi validation middleware factory for Express
const Joi = require('joi');
const { createError } = require('./errorHandler');

/**
 * Validation middleware for Express using Joi.
 * Supports multi-target validation and schema caching.
 * For headers, attaches validated result to req.validated.headers.
 */
const schemaCache = new Map();
function getCacheKey(schema, target) {
  return `${target}:${schema && schema.type ? schema.type : ''}:${schema && schema._ids ? schema._ids._byKey.size : ''}`;
}

function validate(schemas, target = 'body') {
  // Multi-target support
  if (typeof schemas === 'object' && !schemas.isJoi) {
    return async (req, res, next) => {
      try {
        for (const [part, schema] of Object.entries(schemas)) {
          if (!schema) continue;
          let value;
          const cacheKey = getCacheKey(schema, part);
          if (schemaCache.has(cacheKey)) {
            value = await schemaCache.get(cacheKey).validateAsync(req[part], { abortEarly: false, stripUnknown: true, convert: true });
          } else {
            value = await schema.validateAsync(req[part], { abortEarly: false, stripUnknown: true, convert: true });
            schemaCache.set(cacheKey, schema);
          }
          if (part === 'headers') {
            req.validated = req.validated || {};
            req.validated.headers = value;
          } else {
            req[part] = value;
          }
        }
        next();
      } catch (err) {
        const e = createError({
          message: 'Validation failed',
          status: 400,
          type: 'validation',
          details: err.details?.map(d => ({ field: d.path.join('.'), message: d.message.replace(/['\"]/g, '') }))
        });
        e.isJoi = true;
        return next(e);
      }
    };
  }
  // Single-target
  return async (req, res, next) => {
    try {
      let value;
      const cacheKey = getCacheKey(schemas, target);
      if (schemaCache.has(cacheKey)) {
        value = await schemaCache.get(cacheKey).validateAsync(req[target], { abortEarly: false, stripUnknown: true, convert: true });
      } else {
        value = await schemas.validateAsync(req[target], { abortEarly: false, stripUnknown: true, convert: true });
        schemaCache.set(cacheKey, schemas);
      }
      if (target === 'headers') {
        req.validated = req.validated || {};
        req.validated.headers = value;
      } else {
        req[target] = value;
      }
      next();
    } catch (err) {
      const e = createError({
        message: 'Validation failed',
        status: 400,
        type: 'validation',
        details: err.details?.map(d => ({ field: d.path.join('.'), message: d.message.replace(/['\"]/g, '') }))
      });
      e.isJoi = true;
      return next(e);
    }
  };
}

// Common validation schemas
const schemas = {
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().pattern(/^\+91[6-9]\d{9}$/).required(),
  objectId: Joi.string().trim().length(24).hex().required()
};

module.exports = {
  validate,
  schemas
};
