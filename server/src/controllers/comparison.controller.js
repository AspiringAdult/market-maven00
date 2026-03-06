'use strict';

const comparisonService = require('../services/comparison.service');
const { asyncHandler }  = require('../middleware/errorHandler');

/**
 * POST /api/compare
 * Body: { symbols: ["AAPL", "MSFT", ...] }
 */
const compare = asyncHandler(async (req, res) => {
  const { symbols } = req.body;
  const data = await comparisonService.compare(symbols);
  res.sendCached(data);
});

module.exports = { compare };