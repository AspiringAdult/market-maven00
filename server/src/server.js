'use strict';

require('dotenv').config();
const app    = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`🚀 Market Maven API running on port ${config.port} [${config.nodeEnv}]`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received – shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  process.exit(1);
});

module.exports = server;