'use strict';

/**
 * Sentry SDK initialization.
 *
 * Must be required before any other application modules so Sentry can
 * instrument them. In practice, require this at the very top of server.js.
 *
 * Behaviour:
 *  - If SENTRY_DSN is set: full error + performance monitoring enabled
 *  - If SENTRY_DSN is absent: Sentry.init() is called with no DSN, making
 *    all Sentry calls no-ops (safe for local/CI environments)
 *
 * Exported: the Sentry module itself, so callers can use captureException,
 *           captureMessage, etc. without re-requiring @sentry/node.
 */

const Sentry = require('@sentry/node');
const logger = require('./logger');

const dsn     = process.env.SENTRY_DSN;
const env     = process.env.NODE_ENV || 'development';
const version = (() => {
  try { return require('../../package.json').version; } catch { return 'unknown'; }
})();

Sentry.init({
  dsn:         dsn || undefined, // undefined = no-op mode
  environment: env,
  release:     `adpilot-api@${version}`,

  // Capture 100% of transactions in development, 10% in production
  tracesSampleRate: env === 'production' ? 0.1 : 1.0,

  // Attach user / request info to events automatically
  sendDefaultPii: false,

  // Ignore common noise
  ignoreErrors: [
    'JsonWebTokenError',
    'TokenExpiredError',
    'Not Found',
    'Unauthorized',
    'Forbidden',
  ],
});

if (dsn) {
  logger.info('Sentry initialized', { environment: env, release: `adpilot-api@${version}` });
} else {
  logger.warn('Sentry DSN not set — error reporting disabled');
}

module.exports = Sentry;
