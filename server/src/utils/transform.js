'use strict';

/**
 * Normalise a raw yahoo-finance2 historical result into a clean OHLCV array.
 * @param {Array} rawQuotes  Raw result from yahooFinance.historical()
 * @returns {Array}          [{ time, date, open, high, low, close, adjClose, volume }]
 */
function normalizeOHLCV(rawQuotes) {
  if (!Array.isArray(rawQuotes)) return [];

  return rawQuotes
    .filter((q) => q.close != null && !isNaN(q.close))
    .map((q) => {
      const d = new Date(q.date);
      return {
        time:     Math.floor(d.getTime() / 1000),   // UNIX timestamp for TradingView LWC
        date:     d.toISOString().split('T')[0],      // "YYYY-MM-DD"
        open:     safeNum(q.open,     4) ?? 0,
        high:     safeNum(q.high,     4) ?? 0,
        low:      safeNum(q.low,      4) ?? 0,
        close:    safeNum(q.close,    4) ?? 0,
        adjClose: safeNum(q.adjClose, 4) ?? safeNum(q.close, 4) ?? 0,
        volume:   q.volume || 0,
      };
    })
    .sort((a, b) => a.time - b.time);  // always chronological
}

/**
 * Pad a short indicator array with leading nulls so it aligns with ohlcv.
 * @param {Array} ohlcv           Full OHLCV array (reference length)
 * @param {Array} indicatorValues Shorter indicator output
 * @returns {Array}               Same length as ohlcv, nulls prepended
 */
function alignToOHLCV(ohlcv, indicatorValues) {
  const paddingLen = Math.max(0, ohlcv.length - indicatorValues.length);
  const padding    = new Array(paddingLen).fill(null);
  return [...padding, ...indicatorValues];
}

/**
 * Percentage change from previous to current.
 * Returns 0 if previous is zero/null.
 */
function pctChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

/**
 * Safe number formatter.
 * Returns null (not NaN/undefined) for missing or non-numeric values.
 */
function safeNum(val, decimals = 4) {
  const n = parseFloat(val);
  return isNaN(n) ? null : parseFloat(n.toFixed(decimals));
}

module.exports = { normalizeOHLCV, alignToOHLCV, pctChange, safeNum };