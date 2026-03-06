'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/index.controller');
const cache  = require('../middleware/cache.middleware');
const cfg    = require('../config');
const { validate, indexNameValidator } = require('../middleware/validate.middleware');

// FIRST: global indices endpoint
router.get('/', ctrl.getIndices);
// SECOND: single index endpoint
router.get(
  '/:name',
  cache(cfg.cache.indicesTTL),
  [validate([indexNameValidator])],
  ctrl.getIndex
);

module.exports = router;