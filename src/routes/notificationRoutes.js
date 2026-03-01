'use strict';

const express             = require('express');
const { authenticate }    = require('../middleware/auth');
const ctrl                = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate);

router.get('/',           ctrl.getNotifications);
router.patch('/read-all', ctrl.markAllRead);

module.exports = router;
