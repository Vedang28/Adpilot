'use strict';

const express  = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { heavyLimiter }              = require('../middleware/rateLimiter');
const ctrl = require('../controllers/seoController');

const router = express.Router();
router.use(authenticate);

// SEO Audits
router.post('/audit',            heavyLimiter, ctrl.triggerAudit);
router.get('/audits',            ctrl.getAudits);

// Keyword Tracking
router.get('/keywords',          ctrl.getKeywords);
router.get('/keywords/opportunities', ctrl.getOpportunities);
router.post('/keywords/sync',    requireRole('admin', 'manager'), ctrl.syncKeywords);

// Competitor Gap
router.get('/gaps',              ctrl.getCompetitorGaps);

// Content Briefs
router.post('/briefs',           heavyLimiter, ctrl.generateBrief);
router.get('/briefs',            ctrl.getBriefs);

module.exports = router;
