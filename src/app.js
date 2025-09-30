require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware: Request ID propagation (honor inbound X-Request-Id)
app.use((req, res, next) => {
  const incoming = req.header('x-request-id');
  req.id = (incoming && incoming.length <= 128) ? incoming : uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Middleware: Security headers
app.use(helmet());

// Environment-aware CORS configuration
const isProd = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: (origin, cb) => {
    if (!process.env.CORS_ORIGIN) {
      if (isProd) return cb(null, false); // deny all in production if not set
      return cb(null, true); // reflect request origin in dev
    }
    const allowList = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
    return cb(null, !origin || allowList.includes(origin));
  },
  credentials: !!process.env.CORS_ORIGIN // only allow credentials when explicit origins provided
};
app.use(cors(corsOptions));

// Morgan token for request ID and environment-aware log format
morgan.token('id', req => req.id);
if (isProd) {
  // Use enhanced logger for production
  app.use(logger.morgan);
} else {
  app.use(logger.morgan);
}

// Middleware: Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Rentify API',
    version: process.env.API_VERSION || 'v1',
    status: 'OK',
    message: 'Welcome to the Rentify multi-city rental platform API.'
  });
});

// API versioning
app.use('/api/v1', require('./routes'));


// 404 handler (enhanced)
app.use((req, res, next) => {
  const err = new Error('The requested resource does not exist.');
  err.status = 404;
  err.type = 'not_found';
  next(err);
});

// Centralized error handler (last)
app.use(errorHandler);

module.exports = app;
