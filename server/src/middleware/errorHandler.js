'use strict';

const logger = require('../utils/logger');

/**
 * Centralised Express error handler.
 * Must be the LAST middleware registered in app.js.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`, {
    status: err.status,
    stack:  err.stack,
  });

  // Yahoo Finance symbol not found
  if (
    err.name === 'FailedYahooValidationError' ||
    err.message?.includes('Symbol not found') ||
    err.message?.includes('No fundamentals') ||
    err.message?.includes('Not Found')
  ) {
    return res.status(404).json({
      success: false,
      error:   'Symbol not found or data unavailable.',
      code:    'SYMBOL_NOT_FOUND',
    });
  }

  // Upstream rate limiting
  if (err.response?.status === 429) {
    return res.status(429).json({
      success: false,
      error:   'External API rate limit reached. Please try again in a moment.',
      code:    'UPSTREAM_RATE_LIMITED',
    });
  }

  // Network / timeout
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      success: false,
      error:   'External API request timed out.',
      code:    'UPSTREAM_TIMEOUT',
    });
  }

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    success: false,
    error:   err.message || 'Internal server error',
    code:    err.code    || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Wraps an async route handler and forwards any thrown errors to errorHandler.
 * Eliminates the need for try/catch in every controller.
 *
 * Usage:
 *   const doSomething = asyncHandler(async (req, res) => { ... });
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };