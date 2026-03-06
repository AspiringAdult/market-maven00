'use strict';

const NodeCache = require("node-cache");
const axios = require("axios");

const { normalizeOHLCV, pctChange, safeNum } = require('../utils/transform');
const logger = require('../utils/logger');

const quoteCache = new NodeCache({ stdTTL: 60 });

const ALPHA_URL = "https://www.alphavantage.co/query";

class StockService {

  // ─────────────────────────────────────────────────────────
  // Historical data via STOOQ
  // ─────────────────────────────────────────────────────────
  async getHistory(symbol, range = '1y', interval = '1d') {

    logger.debug(`StockService.getHistory ${symbol}`);

    try {

      const stooqSymbol = `${symbol.toLowerCase()}.us`;
      const url = `https://stooq.com/q/d/l/?s=${stooqSymbol}&i=d`;

      const response = await axios.get(url);

      const rows = response.data.trim().split('\n').slice(1);

      if (!rows.length) {
        const err = new Error(`No historical data for symbol: ${symbol}`);
        err.status = 404;
        throw err;
      }

      const data = rows
        .map(row => {

          const [date, open, high, low, close, volume] = row.split(',');

          if (!date || !close) return null;

          const d = new Date(date);

          return {
            time: Math.floor(d.getTime() / 1000),
            date,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            adjClose: parseFloat(close),
            volume: parseInt(volume || 0)
          };

        })
        .filter(Boolean);

      return normalizeOHLCV(data);

    } catch (err) {

      logger.error(`History fetch failed for ${symbol}`, err.message);
      throw err;

    }
  }

  // ─────────────────────────────────────────────────────────
  // Quote via Alpha Vantage
  // ─────────────────────────────────────────────────────────
async getQuote(symbol) {

  const cached = quoteCache.get(symbol);
  if (cached) {
    logger.debug(`Quote cache HIT ${symbol}`);
    return cached;
  }

  logger.debug(`Quote cache MISS ${symbol}`);

  try {

    const stooqSymbol = `${symbol.toLowerCase()}.us`;
    const url = `https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;

    const response = await axios.get(url);

    const row = response.data.split('\n')[1];
    if (!row) throw new Error(`Symbol not found: ${symbol}`);

const parts = row.split(',');

const open = safeNum(parts[3]);
const high = safeNum(parts[4]);
const low = safeNum(parts[5]);
const close = safeNum(parts[6]);
const volume = parseInt(parts[7] || 0);

const result = {
  symbol,
  name: symbol,
  price: close,
  previousClose: close,
  open,
  dayHigh: high,
  dayLow: low,
  week52High: null,
  week52Low: null,
  volume,
  marketCap: null,
  currency: "USD",
  exchange: "STOOQ",
  changeToday: 0,
  changePctToday: 0,
  timestamp: Date.now()
};
    quoteCache.set(symbol, result);
    return result;

  } catch (err) {
    logger.error(`Quote fetch failed for ${symbol}`, err.message);
    throw err;
  }
}
  // ─────────────────────────────────────────────────────────
  // Fundamentals via Alpha Vantage
  // ─────────────────────────────────────────────────────────
  async getFundamentals(symbol) {

    logger.debug(`StockService.getFundamentals ${symbol}`);

    try {

      const response = await axios.get(ALPHA_URL, {
        params: {
          function: "OVERVIEW",
          symbol,
          apikey: process.env.ALPHAVANTAGE_API_KEY
        }
      });

      const d = response.data;

      if (!d || !d.Symbol) {
        const err = new Error(`No fundamentals for symbol: ${symbol}`);
        err.status = 404;
        throw err;
      }

      return {
        symbol,
        peRatio: safeNum(d.PERatio, 2),
        forwardPE: safeNum(d.ForwardPE, 2),
        priceToBook: safeNum(d.PriceToBookRatio, 2),
        dividendYield: safeNum((d.DividendYield || 0) * 100, 4),
        dividendRate: safeNum(d.DividendPerShare, 2),
        marketCap: parseInt(d.MarketCapitalization || 0),
        beta: safeNum(d.Beta, 4),
        eps: safeNum(d.EPS, 2),
        forwardEps: null,
        debtToEquity: safeNum(d.DebtToEquity, 2),
        returnOnEquity: safeNum(d.ReturnOnEquityTTM, 4),
        returnOnAssets: safeNum(d.ReturnOnAssetsTTM, 4),
        revenueGrowth: null,
        grossMargins: null,
        operatingMargins: null,
        totalRevenue: parseInt(d.RevenueTTM || 0),
        freeCashflow: null,
        currentRatio: safeNum(d.CurrentRatio, 2),
        targetMeanPrice: null
      };

    } catch (err) {

      logger.error(`Fundamentals fetch failed`, err.message);
      throw err;

    }
  }

  // ─────────────────────────────────────────────────────────
  // Corporate actions (not available from these APIs)
  // ─────────────────────────────────────────────────────────
  async getCorporateActions(symbol) {

    return {
      symbol,
      dividends: [],
      splits: []
    };

  }

  // ─────────────────────────────────────────────────────────
  // Analyst recommendations (not available)
  // ─────────────────────────────────────────────────────────
  async getRecommendations(symbol) {

    return {
      symbol,
      trend: [],
      upgradeDowngradeHistory: []
    };

  }

}

module.exports = new StockService();