'use strict';

const rateLimit = require('express-rate-limit');

const handler = (req, res) => {
  res.status(429).json({
    success: false,
    data: null,
    error: { message: 'Too many requests — please slow down and try again shortly.' },
    meta: { timestamp: new Date().toISOString() },
  });
};

/** General API limiter: 120 req / minute per IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Auth endpoints: 10 attempts / 15 minutes per IP (brute-force protection) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skipSuccessfulRequests: true, // only count failed requests toward limit
});

/** Heavy compute endpoints: 20 req / minute */
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { apiLimiter, authLimiter, heavyLimiter };
