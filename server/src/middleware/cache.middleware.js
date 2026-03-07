'use strict';

const cache  = require('../config/cache');
const logger = require('../utils/logger');


const cacheMiddleware = (ttl) => (req, res, next) => {
  const key    = `route::${req.originalUrl}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    logger.debug(`Cache HIT  ${key}`);
    return res.json({ success: true, data: cached, cached: true });
  }

  logger.debug(`Cache MISS ${key}`);

  
  res.sendCached = (data) => {
    cache.set(key, data, ttl);
    return res.json({ success: true, data, cached: false });
  };

  next();
};

module.exports = cacheMiddleware;