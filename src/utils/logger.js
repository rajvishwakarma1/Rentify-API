const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function getLevel() {
  return levels[envLevel] !== undefined ? envLevel : 'info';
}

function serialize(obj) {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

function baseLog(level, message, meta) {
  const ts = new Date().toISOString();
  const store = als.getStore() || {};
  const line = {
    ts,
    level,
    msg: message,
    requestId: store.requestId,
    ...meta,
  };
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log; // eslint-disable-line no-console
  out(serialize(line));
}

function shouldLog(level) {
  return levels[level] <= levels[getLevel()];
}

const logger = {
  error(message, meta) { if (shouldLog('error')) baseLog('error', message, meta); },
  warn(message, meta) { if (shouldLog('warn')) baseLog('warn', message, meta); },
  info(message, meta) { if (shouldLog('info')) baseLog('info', message, meta); },
  debug(message, meta) { if (shouldLog('debug')) baseLog('debug', message, meta); },
};

function withRequestContext(req, res, next) {
  als.run({ requestId: req.id }, () => next());
}

module.exports = { logger, withRequestContext };
