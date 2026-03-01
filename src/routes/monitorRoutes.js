'use strict';

const express  = require('express');
const { authenticate } = require('../middleware/auth');
const { heavyLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/monitorController');

const router = express.Router();
router.use(authenticate);

// ── SEO Monitors ────────────────────────────────────────────────────────────
// GET    /api/v1/seo/monitors          → dashboard list (sparklines, score deltas, alerts)
// POST   /api/v1/seo/monitors          → create monitor
// PATCH  /api/v1/seo/monitors/:id      → update name/schedule
// DELETE /api/v1/seo/monitors/:id      → delete monitor + history
// PATCH  /api/v1/seo/monitors/:id/pause   → pause
// PATCH  /api/v1/seo/monitors/:id/resume  → resume
// GET    /api/v1/seo/monitors/:id/timeline → score history
// POST   /api/v1/seo/monitors/:id/run-now → enqueue immediately

router.get('/',                            ctrl.listMonitors);
router.post('/',          heavyLimiter,    ctrl.createMonitor);
router.patch('/:id',                       ctrl.updateMonitor);
router.delete('/:id',                      ctrl.deleteMonitor);
router.patch('/:id/pause',                 ctrl.pauseMonitor);
router.patch('/:id/resume',                ctrl.resumeMonitor);
router.get('/:id/timeline',                ctrl.getTimeline);
router.post('/:id/run-now', heavyLimiter,  ctrl.runNow);

module.exports = router;
