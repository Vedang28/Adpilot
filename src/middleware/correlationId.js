'use strict';

const { randomUUID } = require('crypto');

/**
 * Attaches a unique correlation ID to every request.
 * Propagates from X-Correlation-Id header if present (useful for distributed tracing).
 */
function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}

module.exports = correlationId;
