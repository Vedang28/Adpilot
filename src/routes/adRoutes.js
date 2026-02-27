'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { list, create, update, remove, generate } = require('../controllers/adController');

const router = express.Router();

router.use(authenticate);

// Campaign-scoped ad routes
router.get('/campaigns/:campaignId/ads', list);
router.post('/campaigns/:campaignId/ads', create);
router.post('/campaigns/:campaignId/ads/generate', generate);

// Ad-level routes
router.patch('/ads/:id', update);
router.delete('/ads/:id', remove);

module.exports = router;
