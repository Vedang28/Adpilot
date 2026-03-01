'use strict';

const express = require('express');
const router  = express.Router();

/**
 * GET /health
 *
 * Ultra-fast liveness check — no DB or Redis calls.
 * Railway, Render, and other PaaS platforms hit this to decide if the
 * container is alive. Must respond in milliseconds so it never times out.
 *
 * For deep infrastructure checks (DB, Redis, queues) use GET /health/detailed
 * which is mounted separately after auth-free routes.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;
