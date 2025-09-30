const mongoose = require('mongoose');

const DB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'rentify';
const options = {
  dbName: DB_NAME,
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  autoIndex: process.env.NODE_ENV !== 'production',
};

let isConnecting = false;

function log(msg) {
  if (process.env.LOG_LEVEL !== 'silent') console.log(`[db] ${msg}`);
}

mongoose.connection.on('connected', () => log('MongoDB connected'));
mongoose.connection.on('error', (err) => log('MongoDB connection error: ' + err));
mongoose.connection.on('disconnected', () => log('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => log('MongoDB reconnected'));

async function connectDatabase(retries = 5, delay = 2000) {
  if (!DB_URI) {
    isConnecting = false;
    throw new Error('MONGODB_URI is not set. Please configure the connection string.');
  }
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(DB_URI, options);
      isConnecting = false;
      return;
    } catch (err) {
      log(`Connection attempt ${i + 1} failed: ${err}`);
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
    }
  }
  isConnecting = false;
  throw new Error('Failed to connect to MongoDB after retries');
}

async function disconnectDatabase() {
  await mongoose.connection.close();
  log('MongoDB connection closed');
}


async function checkDatabaseHealth(timeoutMs = 2000) {
  const readyState = mongoose.connection.readyState;
  const start = Date.now();
  let status = 'down';
  let error = undefined;
  try {
    if (readyState !== 1) {
      return { status: 'down', latencyMs: null, readyState, error: 'Not connected' };
    }
    const pingPromise = mongoose.connection.db.admin().command({ ping: 1 });
    const res = await Promise.race([
      pingPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), timeoutMs))
    ]);
    status = res && res.ok === 1 ? 'up' : 'down';
  } catch (err) {
    error = err.message;
    status = 'down';
  }
  const latencyMs = Date.now() - start;
  return { status, latencyMs, readyState, error };
}


async function gracefulShutdown() {
  let exited = false;
  const exit = (code) => { if (!exited) { exited = true; process.exit(code); } };
  try {
    const timeout = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit.');
      exit(1);
    }, 5000);
    await disconnectDatabase();
    clearTimeout(timeout);
    exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    exit(1);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth
};
