const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const { initMongooseMonitor } = require('../utils/mongooseMonitor');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'rentify';

let isConnecting = false;

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
  try {
  await mongoose.connect(uri, options);
  initMongooseMonitor(mongoose);
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { error: err.message }));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDatabase, disconnectDatabase };
