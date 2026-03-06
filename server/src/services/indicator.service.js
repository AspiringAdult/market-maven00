'use strict';

const ti = require('technicalindicators');
const { alignToOHLCV, safeNum } = require('../utils/transform');
const logger = require('../utils/logger');

class IndicatorService {
  /**
   * Calculate the full technical indicator suite from a normalised OHLCV array.
   * All output arrays are padded to the same length as ohlcv (nulls for warm-up period).
   *
   * @param {Array} ohlcv  Normalised OHLCV — must contain { time, date, open, high, low, close, volume }
   * @returns {Object}     { dates, times, sma20, sma50, ema20, rsi, macd, macdSignal,
   *                         macdHistogram, bbUpper, bbMiddle, bbLower, vwap, hv, latest }
   */
  calculate(ohlcv) {
    if (!Array.isArray(ohlcv) || ohlcv.length < 30) {
      const err = new Error(
        `Insufficient data for indicator calculation. Need ≥ 30 candles, got ${ohlcv?.length ?? 0}.`
      );
      err.status = 400;
      throw err;
    }

    logger.debug(`IndicatorService.calculate: ${ohlcv.length} candles`);

    const close  = ohlcv.map((d) => d.close);
    const high   = ohlcv.map((d) => d.high);
    const low    = ohlcv.map((d) => d.low);
    const volume = ohlcv.map((d) => d.volume);

    // ── Moving averages ───────────────────────────────────────────────────────
    const sma20Raw = ti.SMA.calculate({ values: close, period: 20 });
    const sma50Raw = ti.SMA.calculate({ values: close, period: 50 });
    const ema20Raw = ti.EMA.calculate({ values: close, period: 20 });

    // ── RSI (14) ──────────────────────────────────────────────────────────────
    const rsiRaw = ti.RSI.calculate({ values: close, period: 14 });

    // ── MACD (12, 26, 9) ──────────────────────────────────────────────────────
    const macdRaw = ti.MACD.calculate({
      values:               close,
      fastPeriod:           12,
      slowPeriod:           26,
      signalPeriod:         9,
      SimpleMAOscillator:   false,
      SimpleMASignal:       false,
    });

    // ── Bollinger Bands (20, 2σ) ──────────────────────────────────────────────
    const bbRaw = ti.BollingerBands.calculate({
      values:  close,
      period:  20,
      stdDev:  2,
    });

    // ── VWAP ──────────────────────────────────────────────────────────────────
    const vwapRaw = ti.VWAP.calculate({ close, high, low, volume });

    // ── Historical volatility (rolling 21-day, annualised) ────────────────────
    const hvSeries = this._rollingHV(close, 21);

    // ── Align all arrays to ohlcv length ──────────────────────────────────────
    const sma20      = alignToOHLCV(ohlcv, sma20Raw);
    const sma50      = alignToOHLCV(ohlcv, sma50Raw);
    const ema20      = alignToOHLCV(ohlcv, ema20Raw);
    const rsi        = alignToOHLCV(ohlcv, rsiRaw);
    const vwap       = alignToOHLCV(ohlcv, vwapRaw);
    const macd       = alignToOHLCV(ohlcv, macdRaw.map((m) => safeNum(m.MACD,      4)));
    const macdSignal = alignToOHLCV(ohlcv, macdRaw.map((m) => safeNum(m.signal,    4)));
    const macdHist   = alignToOHLCV(ohlcv, macdRaw.map((m) => safeNum(m.histogram, 4)));
    const bbUpper    = alignToOHLCV(ohlcv, bbRaw.map((b) => safeNum(b.upper,  4)));
    const bbMiddle   = alignToOHLCV(ohlcv, bbRaw.map((b) => safeNum(b.middle, 4)));
    const bbLower    = alignToOHLCV(ohlcv, bbRaw.map((b) => safeNum(b.lower,  4)));

    // ── Latest scalar values (for metric cards) ───────────────────────────────
    const last = (arr) => arr[arr.length - 1] ?? null;

    const latest = {
      sma20:        safeNum(last(sma20Raw), 4),
      sma50:        safeNum(last(sma50Raw), 4),
      ema20:        safeNum(last(ema20Raw), 4),
      rsi:          safeNum(last(rsiRaw),  2),
      macd:         safeNum(last(macdRaw)?.MACD,      4),
      macdSignal:   safeNum(last(macdRaw)?.signal,    4),
      macdHist:     safeNum(last(macdRaw)?.histogram, 4),
      bbUpper:      safeNum(last(bbRaw)?.upper,  4),
      bbMiddle:     safeNum(last(bbRaw)?.middle, 4),
      bbLower:      safeNum(last(bbRaw)?.lower,  4),
      hv:           safeNum(last(hvSeries), 4),
      hvAnnualised: safeNum(this._annualisedHV(close, 252), 4),
    };

    return {
      dates:         ohlcv.map((d) => d.date),
      times:         ohlcv.map((d) => d.time),
      sma20,
      sma50,
      ema20,
      rsi,
      vwap,
      macd,
      macdSignal,
      macdHistogram: macdHist,
      bbUpper,
      bbMiddle,
      bbLower,
      hv:            hvSeries,
      latest,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Rolling HV: for each window of `period` log-returns, compute annualised std-dev × √252.
   * Output length === closes.length (first period-1 elements are null).
   */
  _rollingHV(closes, period = 21) {
    const logReturns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
    // pad so output aligns with closes
    const result = new Array(closes.length).fill(null);

    for (let i = period; i <= logReturns.length; i++) {
      const slice   = logReturns.slice(i - period, i);
      const mean    = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance= slice.reduce((s, r) => s + (r - mean) ** 2, 0) / slice.length;
      result[i]     = parseFloat((Math.sqrt(variance * 252) * 100).toFixed(4));
    }
    return result;
  }

  /**
   * Single annualised HV scalar over the full lookback period (for metric card).
   */
  _annualisedHV(closes, period = 252) {
    const slice      = closes.slice(-Math.min(period, closes.length));
    const logReturns = slice.slice(1).map((c, i) => Math.log(c / slice[i]));
    if (!logReturns.length) return 0;
    const mean    = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance= logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / logReturns.length;
    return parseFloat((Math.sqrt(variance * 252) * 100).toFixed(4));
  }
}

module.exports = new IndicatorService();