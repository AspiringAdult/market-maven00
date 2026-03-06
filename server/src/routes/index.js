'use strict';

const router = require('express').Router();
const cache  = require('../config/cache');
const pkg    = require('../../package.json');

// Mount feature routers
router.use('/stock',     require('./stock.routes'));
router.use('/sentiment', require('./sentiment.routes'));
router.use('/terminal', require('./terminal.routes'));
router.use('/compare',   require('./comparison.routes'));
router.use('/indices',   require('./index.routes'));
router.use('/search', require('./search'));
// Health check – no caching
router.get('/health', (req, res) => {
  const stats = cache.getStats();
  const hitRate =
    stats.hits + stats.misses > 0
      ? `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`
      : '0%';

  res.json({
    success: true,
    status:  'ok',
    version: pkg.version,
    uptime:  Math.floor(process.uptime()),
    memory:  process.memoryUsage().heapUsed,
    cache: {
      keys:    stats.keys,
      hits:    stats.hits,
      misses:  stats.misses,
      hitRate,
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;