'use strict';

const cache  = require('../config/cache');
const logger = require('../utils/logger');

/**
 * Route-level caching middleware.
 *
 * Usage:
 *   router.get('/path', cacheMiddleware(300), controller)
 *
 * Attaches res.sendCached(data) so controllers write to cache in one call.
 */
const cacheMiddleware = (ttl) => (req, res, next) => {
  const key    = `route::${req.originalUrl}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    logger.debug(`Cache HIT  ${key}`);
    return res.json({ success: true, data: cached, cached: true });
  }

  logger.debug(`Cache MISS ${key}`);

  /**
   * res.sendCached(data)
   * Stores data in cache then sends the JSON response.
   */
  res.sendCached = (data) => {
    cache.set(key, data, ttl);
    return res.json({ success: true, data, cached: false });
  };

  next();
};

module.exports = cacheMiddleware;