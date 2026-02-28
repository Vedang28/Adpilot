'use strict';

const { AsyncLocalStorage } = require('async_hooks');

/**
 * Application-wide AsyncLocalStorage for request/job context propagation.
 *
 * Store shape: { traceId, teamId?, jobId?, provider? }
 *
 * The store object is mutable — middleware can stamp additional fields
 * (e.g. teamId after auth) onto the same object without re-running als.run().
 *
 * Usage in middleware/processors:
 *   als.run({ traceId: id }, next)        // HTTP request
 *   als.run({ traceId: id, jobId: id }, fn) // queue job
 *
 * Usage in logger (automatic):
 *   const ctx = als.getStore() || {};
 */
const als = new AsyncLocalStorage();

module.exports = als;
