'use strict';

const sentimentService = require('../services/sentiment.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/sentiment/:symbol
 * Query: pageSize (default 10)
 */
const getSentiment = asyncHandler(async (req, res) => {
  const { symbol }         = req.params;
  const { pageSize = 10 }  = req.query;
  const data = await sentimentService.getArticlesWithSentiment(
    symbol.toUpperCase(),
    parseInt(pageSize, 10)
  );
  res.sendCached(data);
});

module.exports = { getSentiment };