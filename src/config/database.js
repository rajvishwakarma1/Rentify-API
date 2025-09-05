const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const { initMongooseMonitor } = require('../utils/mongooseMonitor');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'rentify';

const MAX_RETRIES = Number(process.env.MONGODB_CONNECT_RETRIES || 10);
const RETRY_DELAY_MS = Number(process.env.MONGODB_CONNECT_RETRY_DELAY_MS || 2000);

let isConnecting = false;
let lastConnectError;
let lastAttemptAt;
let attemptsSoFar = 0;

async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function connectDatabase() {
  if (mongoose.connection.readyState === 1 || isConnecting) return;
  isConnecting = true;
  const uri = `${MONGODB_URI}/${DB_NAME}`;
  const options = {
    maxPoolSize: 20,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: process.env.NODE_ENV !== 'production',
  };

  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      attemptsSoFar = attempt;
      lastAttemptAt = new Date();
      await mongoose.connect(uri, options);
      initMongooseMonitor(mongoose);
      logger.info('MongoDB connected');
      lastErr = undefined;
      lastConnectError = undefined;
      break;
    } catch (err) {
      lastErr = err;
      lastConnectError = err && err.message ? err.message : String(err);
      logger.warn('MongoDB connect attempt failed', { attempt, error: err && err.message ? err.message : String(err) });
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    } finally {
      if (mongoose.connection.readyState === 1) {
        isConnecting = false;
      }
    }
  }

  // If still not connected after retries, surface the last error
  if (mongoose.connection.readyState !== 1 && lastErr) {
    isConnecting = false;
    throw lastErr;
  }
  isConnecting = false;
}

function getDbDiagnostics() {
  const state = mongoose.connection.readyState; // 0..3
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    state,
    status: statusMap[state] || 'unknown',
    isConnecting,
    attemptsSoFar,
    lastAttemptAt: lastAttemptAt ? lastAttemptAt.toISOString() : undefined,
    lastError: lastConnectError,
    uriHost: (() => { try { const u = new URL(`${MONGODB_URI}/`); return u.hostname; } catch { return undefined; } })(),
    dbName: DB_NAME,
  };
}

mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { error: err.message }));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDatabase, disconnectDatabase, getDbDiagnostics };
