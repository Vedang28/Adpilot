'use strict';

const express    = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl       = require('../controllers/dashboardController');

const router = express.Router();
router.use(authenticate);

router.get('/metrics', ctrl.getMetrics);

module.exports = router;
