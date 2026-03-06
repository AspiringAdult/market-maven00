'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/sentiment.controller');
const cache  = require('../middleware/cache.middleware');
const cfg    = require('../config');
const { validate, symbolValidator } = require('../middleware/validate.middleware');

router.get(
  '/:symbol',
  cache(cfg.cache.sentimentTTL),
  [validate([symbolValidator])],
  ctrl.getSentiment
);

module.exports = router;