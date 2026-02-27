'use strict';

const xss = require('xss');

/**
 * Recursively sanitize all string values in an object against XSS.
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') return xss(obj);
  if (Array.isArray(obj))     return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = sanitizeObject(v);
    }
    return clean;
  }
  return obj;
}

/**
 * Express middleware — sanitizes req.body and req.query in-place.
 */
function sanitize(req, res, next) {
  if (req.body)  req.body  = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  next();
}

module.exports = sanitize;
