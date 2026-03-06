'use strict';

const { param, query, body, validationResult } = require('express-validator');

/**
 * Run an array of validator chains and short-circuit with 400 if any fail.
 */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ── Reusable validator chains ─────────────────────────────────────────────────

const symbolValidator = param('symbol')
  .trim()
  .toUpperCase()
  .isLength({ min: 1, max: 10 })
  .matches(/^[A-Z0-9.\-\^]+$/)
  .withMessage('Invalid stock symbol. Use 1–10 uppercase characters (A-Z, 0-9, ., -, ^)');

const rangeValidator = query('range')
  .optional()
  .isIn(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'])
  .withMessage('Invalid range. Allowed: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max');

const intervalValidator = query('interval')
  .optional()
  .isIn(['1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo'])
  .withMessage('Invalid interval. Allowed: 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo');

const compareBodyValidator = body('symbols')
  .isArray({ min: 2, max: 10 })
  .withMessage('symbols must be an array with 2–10 stock symbols')
  .custom((arr) => arr.every((s) => typeof s === 'string' && s.trim().length > 0))
  .withMessage('Each symbol must be a non-empty string');

const indexNameValidator = param('name')
  .trim()
  .toUpperCase()
  .isIn(['NIFTY50', 'FINNIFTY', 'NIFTYBANK', 'NASDAQ'])
  .withMessage('Invalid index name. Allowed: NIFTY50, FINNIFTY, NIFTYBANK, NASDAQ');

module.exports = {
  validate,
  symbolValidator,
  rangeValidator,
  intervalValidator,
  compareBodyValidator,
  indexNameValidator,
};