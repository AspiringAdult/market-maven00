'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/comparison.controller');
const cache  = require('../middleware/cache.middleware');
const cfg    = require('../config');
const { validate, compareBodyValidator } = require('../middleware/validate.middleware');

router.post(
  '/',
  cache(cfg.cache.comparisonTTL),
  [validate([compareBodyValidator])],
  ctrl.compare
);

module.exports = router;