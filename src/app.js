const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { withRequestContext } = require('./utils/logger');

const app = express();

// Assign or generate a request ID and echo in responses
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : crypto.randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
});

// Security & CORS
app.use(helmet());
app.use(cors());

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request-scoped context for logging
app.use(withRequestContext);

// HTTP logging
morgan.token('id', (req) => req.id);
const morganFormat = process.env.NODE_ENV === 'production'
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" reqId=:id'
  : '[:date[iso]] :method :url :status - :response-time ms reqId=:id';
app.use(morgan(morganFormat));

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found', path: req.originalUrl, requestId: req.id });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
