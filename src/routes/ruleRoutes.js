'use strict';

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/ruleController');

const router = express.Router();
router.use(authenticate);

router.get('/trigger-types',         ctrl.listTriggerTypes);
router.get('/',                      ctrl.listRules);
router.post('/',                     requireRole('admin', 'manager'), ctrl.createRule);
router.patch('/:id',                 requireRole('admin', 'manager'), ctrl.updateRule);
router.delete('/:id',                requireRole('admin', 'manager'), ctrl.deleteRule);
router.post('/evaluate',             requireRole('admin', 'manager'), ctrl.triggerEvaluation);

module.exports = router;
