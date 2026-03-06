'use strict';

const NodeCache = require('node-cache');

/**
 * Single shared cache instance for the entire application.
 * stdTTL is the default fallback; each route overrides it via cacheMiddleware(ttl).
 */
const cache = new NodeCache({
  stdTTL:      300,   // 5 minutes default
  checkperiod: 60,    // prune expired keys every 60 s
  useClones:   false, // store references – faster for large OHLCV arrays
});

module.exports = cache;