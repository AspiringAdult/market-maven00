'use strict';

require('dotenv').config();

const config = {
  port:    parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  newsApiKey: process.env.NEWS_API_KEY || '',

  allowedOrigins: (
    process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000'
  ).split(',').map((o) => o.trim()),

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 2000  },

  // Cache TTLs in seconds
  cache: {
    quoteTTL:        30,
    historyTTL:      300,
    indicatorsTTL:   300,
    fundamentalsTTL: 3600,
    sentimentTTL:    900,
    comparisonTTL:   120,
    indicesTTL:      86400,
  },
};

module.exports = config;