// Structured logging utility for Express and Node.js
const util = require('util');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');


const env = process.env.NODE_ENV || 'development';
let logStream = null;
if (process.env.LOG_TO_FILE === 'true') {
  try {
    const dir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
    fs.mkdirSync(dir, { recursive: true });
    logStream = fs.createWriteStream(path.join(dir, 'app.log'), { flags: 'a' });
  } catch (e) {
    console.warn('File logging disabled:', e.message);
    logStream = null;
  }
}

const RAW_SENSITIVE_KEYS = ['password', 'authorization', 'token', 'accessToken', 'refreshToken'];
const SENSITIVE_KEYS = new Set(RAW_SENSITIVE_KEYS.map(k => k.toLowerCase()));
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const k in obj) {
    const key = k.toLowerCase();
    if (SENSITIVE_KEYS.has(key)) {
      out[k] = '[REDACTED]';
    } else if (typeof obj[k] === 'object' && obj[k] !== null) {
      out[k] = sanitize(obj[k]);
    } else {
      out[k] = obj[k];
    }
  }
  return out;
}

function formatLog(level, message, meta) {
  const base = { level, message, timestamp: new Date().toISOString(), ...sanitize(meta) };
  return env === 'production' ? JSON.stringify(base) : util.format('[%s] %s: %s %j', base.timestamp, level.toUpperCase(), message, base);
}

function log(level, message, meta) {
  const formatted = formatLog(level, message, meta);
  if (logStream) {
    logStream.write(formatted + '\n');
    // Also log to console for compatibility
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  } else {
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

function createRequestLogger(req) {
  const requestId = req.id || req.headers['x-request-id'];
  return {
    info: (msg, meta) => log('info', msg, { ...meta, requestId }),
    warn: (msg, meta) => log('warn', msg, { ...meta, requestId }),
    error: (msg, meta) => log('error', msg, { ...meta, requestId }),
    debug: (msg, meta) => log('debug', msg, { ...meta, requestId })
  };
}

function withRequest(req) {
  return {
    info: (msg, meta) => log('info', msg, { ...meta, requestId: req.id }),
    warn: (msg, meta) => log('warn', msg, { ...meta, requestId: req.id }),
    error: (msg, meta) => log('error', msg, { ...meta, requestId: req.id }),
    debug: (msg, meta) => log('debug', msg, { ...meta, requestId: req.id })
  };
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
  morgan: morgan((tokens, req, res) => {
    return formatLog('http', `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)}`, {
      requestId: req.id,
      responseTime: tokens['response-time'](req, res),
      userAgent: tokens['user-agent'](req, res),
      headers: sanitize(req.headers)
    });
  }, { stream: logStream || process.stdout }),
  sanitize,
  createRequestLogger,
  withRequest
};
