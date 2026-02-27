'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('./index');

const { combine, timestamp, colorize, printf, json } = format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]: ${message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  json()
);

const logger = createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.nodeEnv === 'production' ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
  ],
  exceptionHandlers: [
    new transports.Console(),
  ],
  rejectionHandlers: [
    new transports.Console(),
  ],
});

module.exports = logger;
