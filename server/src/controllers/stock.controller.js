'use strict';

const stockService     = require('../services/stock.service');
const indicatorService = require('../services/indicator.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/stock/:symbol/history
 * Query: range (default 1y), interval (default 1d)
 */
const getHistory = asyncHandler(async (req, res) => {
  const { symbol }           = req.params;
  const { range = '1y', interval = '1d' } = req.query;
  const data = await stockService.getHistory(symbol.toUpperCase(), range, interval);
  res.sendCached(data);
});

/**
 * GET /api/stock/:symbol/quote
 */
const getQuote = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const data = await stockService.getQuote(symbol.toUpperCase());
  res.sendCached(data);
});

/**
 * GET /api/stock/:symbol/indicators
 * Fetches OHLCV then runs full indicator suite.
 */
const getIndicators = asyncHandler(async (req, res) => {
  const { symbol }           = req.params;
  const { range = '1y', interval = '1d' } = req.query;
  const ohlcv      = await stockService.getHistory(symbol.toUpperCase(), range, interval);
  const indicators = indicatorService.calculate(ohlcv);
  res.sendCached({ ohlcv, indicators });
});

/**
 * GET /api/stock/:symbol/fundamentals
 */
const getFundamentals = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const data = await stockService.getFundamentals(symbol.toUpperCase());
  res.sendCached(data);
});

/**
 * GET /api/stock/:symbol/corporate-actions
 */
const getCorporateActions = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const data = await stockService.getCorporateActions(symbol.toUpperCase());
  res.sendCached(data);
});

/**
 * GET /api/stock/:symbol/recommendations
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const data = await stockService.getRecommendations(symbol.toUpperCase());
  res.sendCached(data);
});

module.exports = {
  getHistory,
  getQuote,
  getIndicators,
  getFundamentals,
  getCorporateActions,
  getRecommendations,
};