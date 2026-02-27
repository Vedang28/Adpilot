'use strict';

const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

let client;

function getRedis() {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error', { error: err.message }));
    client.on('close', () => logger.warn('Redis connection closed'));
  }
  return client;
}

module.exports = { getRedis };
