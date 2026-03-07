'use strict';

const express    = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl       = require('../controllers/dashboardController');

const router = express.Router();
router.use(authenticate);

router.get('/metrics',         ctrl.getMetrics);
router.get('/health-score',    ctrl.getHealthScore);
router.get('/recommendations', ctrl.getRecommendations);

module.exports = router;
