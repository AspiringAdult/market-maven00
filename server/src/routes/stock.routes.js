'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/stock.controller');
const cache  = require('../middleware/cache.middleware');
const cfg    = require('../config');
const {
  validate,
  symbolValidator,
  rangeValidator,
  intervalValidator,
} = require('../middleware/validate.middleware');

// Validator bundles
const symOnly  = [validate([symbolValidator])];
const symRange = [validate([symbolValidator, rangeValidator, intervalValidator])];

router.get('/:symbol/history',           cache(cfg.cache.historyTTL),      symRange, ctrl.getHistory);
router.get('/:symbol/quote',             cache(cfg.cache.quoteTTL),         symOnly,  ctrl.getQuote);
router.get('/:symbol/indicators',        cache(cfg.cache.indicatorsTTL),   symRange, ctrl.getIndicators);
router.get('/:symbol/fundamentals',      cache(cfg.cache.fundamentalsTTL), symOnly,  ctrl.getFundamentals);
router.get('/:symbol/corporate-actions', cache(cfg.cache.fundamentalsTTL), symOnly,  ctrl.getCorporateActions);
router.get('/:symbol/recommendations',   cache(cfg.cache.fundamentalsTTL), symOnly,  ctrl.getRecommendations);
module.exports = router;