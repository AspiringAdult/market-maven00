'use strict';

const stockService = require('./stock.service');
const { pctChange, safeNum } = require('../utils/transform');
const logger = require('../utils/logger');

class ComparisonService {
  /**
   * Compare multiple stocks in parallel.
   * Uses Promise.allSettled so one failing symbol doesn't abort the rest.
   *
   * @param {string[]} symbols  Array of stock symbols
   * @returns {Object}          { symbols, rows (sorted by 1Y return), failed }
   */
  async compare(symbols) {
    const normalised = symbols.map((s) => s.trim().toUpperCase());
    logger.debug(`ComparisonService.compare: [${normalised.join(', ')}]`);

    const results = await Promise.allSettled(
      normalised.map((symbol) =>
        Promise.all([
          stockService.getQuote(symbol),
          stockService.getHistory(symbol, '1y', '1d'),
        ]).then(([quote, history]) => ({ symbol, quote, history }))
      )
    );

    const rows   = [];
    const failed = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        rows.push(this._buildRow(result.value));
      } else {
        failed.push({
          symbol: normalised[idx],
          error:  result.reason?.message || 'Unknown error',
        });
        logger.warn(`Comparison: failed for ${normalised[idx]} – ${result.reason?.message}`);
      }
    });

    // Sort by 1-year % return descending
    rows.sort((a, b) => (b.pctDiff1Y || 0) - (a.pctDiff1Y || 0));

    return { symbols: normalised, rows, failed };
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _buildRow({ symbol, quote, history }) {
    const firstClose = history[0]?.close                  || quote.price;
    const lastClose  = history[history.length - 1]?.close || quote.price;

    // Normalise to base 100 for relative performance chart
    const base = firstClose || 1;
    const normalisedSeries = history.map((d) => ({
      time:  d.time,
      date:  d.date,
      value: safeNum((d.close / base) * 100, 2),
    }));

    return {
      symbol,
      name:            quote.name,
      currentPrice:    quote.price,
      currency:        quote.currency,
      priceDiff1Y:     safeNum(lastClose - firstClose, 2),
      pctDiff1Y:       safeNum(pctChange(lastClose, firstClose), 2),
      week52High:      quote.week52High,
      week52Low:       quote.week52Low,
      marketCap:       quote.marketCap,
      volume:          quote.volume,
      changeToday:     quote.changeToday,
      changePctToday:  quote.changePctToday,
      normalisedSeries,
    };
  }
}

module.exports = new ComparisonService();