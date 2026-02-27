'use strict';

const config = require('./config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const app = require('./app');

let server;

async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('Database connected');

    server = app.listen(config.port, () => {
      console.log(`\n🚀 AdPilot API running on port ${config.port} [${config.nodeEnv}]\n`);
      logger.info(`Server started`, { port: config.port, env: config.nodeEnv });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`${signal} received – shutting down gracefully`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
