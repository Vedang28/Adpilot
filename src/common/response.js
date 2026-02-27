'use strict';

/**
 * Unified response envelope:
 * { success, data, error, meta }
 */

function success(res, data = {}, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
}

function created(res, data = {}, meta = {}) {
  return success(res, data, 201, meta);
}

function paginated(res, items, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return success(res, { items }, 200, {
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}

function failure(res, message, statusCode = 500, code = null) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { message, code },
    meta: { timestamp: new Date().toISOString() },
  });
}

module.exports = { success, created, paginated, failure };
