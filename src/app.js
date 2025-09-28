require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
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
if (isProd && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN must be set in production environment');
}
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
morgan.token('id', (req) => req.id);
const morganFormat = isProd
  ? ':id :remote-addr :method :url :status :res[content-length] - :response-time ms :user-agent'
  : ':id :method :url :status :res[content-length] - :response-time ms';
app.use(morgan(morganFormat));

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

// API versioning (routes to be added in future phases)
// app.use('/api/v1', require('./routes'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist.',
    requestId: req.id
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${req.id}]`, err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
    requestId: req.id
  });
});

module.exports = app;
