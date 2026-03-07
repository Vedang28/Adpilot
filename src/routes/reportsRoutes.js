'use strict';

const express         = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl            = require('../controllers/reportsController');

const router = express.Router();
router.use(authenticate);

router.get('/generate', ctrl.generate);

module.exports = router;
