require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = http.createServer(app);

async function start() {
  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT} (${NODE_ENV})`);
  });

  try {
    await connectDatabase();
  } catch (err) {
    logger.error('Initial MongoDB connection failed', { error: err.message });
  }
}

start();

function shutdown(signal) {
  return async () => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing server', { error: err.message });
        process.exit(1);
      }
      try {
        await disconnectDatabase();
      } catch (e) {
        logger.warn('Error during MongoDB disconnect', { error: e.message });
      } finally {
        logger.info('Shutdown complete');
        process.exit(0);
      }
    });
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: reason && reason.message ? reason.message : String(reason) });
});
