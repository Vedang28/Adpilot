'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  list,
  getOne,
  create,
  update,
  remove,
  launch,
  pause,
} = require('../controllers/campaignController');

const router = express.Router();

router.use(authenticate);

router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/launch', launch);
router.post('/:id/pause', pause);

module.exports = router;
