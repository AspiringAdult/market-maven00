'use strict';

const indicatorService = require('../src/services/indicator.service');

function makeOHLCV(n = 100) {
  const ohlcv = [];
  let price   = 150;
  const start = new Date('2023-01-02');

  for (let i = 0; i < n; i++) {
    price = Math.max(price + (Math.random() - 0.5) * 4, 1);
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    ohlcv.push({
      time:   Math.floor(d.getTime() / 1000),
      date:   d.toISOString().split('T')[0],
      open:   parseFloat((price * 0.998).toFixed(4)),
      high:   parseFloat((price * 1.01).toFixed(4)),
      low:    parseFloat((price * 0.99).toFixed(4)),
      close:  parseFloat(price.toFixed(4)),
      volume: Math.floor(Math.random() * 2_000_000 + 500_000),
    });
  }
  return ohlcv;
}

describe('IndicatorService.calculate', () => {
  const ohlcv = makeOHLCV(120);
  let result;

  beforeAll(() => {
    result = indicatorService.calculate(ohlcv);
  });

  test('returns all required top-level keys', () => {
    const keys = [
      'dates', 'times', 'sma20', 'sma50', 'ema20',
      'rsi', 'macd', 'macdSignal', 'macdHistogram',
      'bbUpper', 'bbMiddle', 'bbLower', 'vwap', 'hv', 'latest',
    ];
    keys.forEach((k) => expect(result).toHaveProperty(k));
  });

  test('all array outputs have the same length as input ohlcv', () => {
    const arrayKeys = [
      'dates', 'times', 'sma20', 'sma50', 'ema20',
      'rsi', 'macd', 'macdSignal', 'macdHistogram',
      'bbUpper', 'bbMiddle', 'bbLower', 'hv',
    ];
    arrayKeys.forEach((k) => {
      expect(result[k].length).toBe(ohlcv.length);
    });
  });

  test('RSI values are in range 0–100 (non-null only)', () => {
    result.rsi
      .filter((v) => v !== null)
      .forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
  });

  test('latest.rsi is a number', () => {
    expect(typeof result.latest.rsi).toBe('number');
  });

  test('latest.hvAnnualised is a positive number', () => {
    expect(result.latest.hvAnnualised).toBeGreaterThan(0);
  });

  test('SMA50 has at least 70 non-null values with 120 candles', () => {
    const nonNull = result.sma50.filter((v) => v !== null);
    expect(nonNull.length).toBeGreaterThanOrEqual(70);
  });

  test('Bollinger upper is always >= lower (non-null pairs)', () => {
    result.bbUpper.forEach((upper, i) => {
      const lower = result.bbLower[i];
      if (upper !== null && lower !== null) {
        expect(upper).toBeGreaterThanOrEqual(lower);
      }
    });
  });

  test('throws when ohlcv has < 30 candles', () => {
    expect(() => indicatorService.calculate(makeOHLCV(10))).toThrow();
  });

  test('throws when ohlcv is empty', () => {
    expect(() => indicatorService.calculate([])).toThrow();
  });
});