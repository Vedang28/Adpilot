'use strict';

const logger = require('../config/logger');
const AppError = require('../common/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId;

  // Normalize Prisma known-errors into AppErrors
  if (err.code === 'P2002') {
    err = AppError.conflict('A record with that value already exists.');
  } else if (err.code === 'P2025') {
    err = AppError.notFound('Record');
  } else if (err.code === 'P2003') {
    err = AppError.badRequest('Foreign key constraint failed.', 'FK_CONSTRAINT');
  }

  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational || statusCode >= 500) {
    logger.error('Unhandled error', {
      correlationId,
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
    });
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      message: isOperational ? err.message : 'Internal server error',
      code: err.code || null,
    },
    meta: { timestamp: new Date().toISOString(), correlationId },
  });
}

module.exports = { errorHandler, AppError };
