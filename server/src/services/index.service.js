'use strict';

const fs   = require('fs');
const path = require('path');
const { pctChange, safeNum } = require('../utils/transform');
const logger = require('../utils/logger');

const DATA_DIR    = path.join(__dirname, '../data');
const VALID_NAMES = ['NIFTY50', 'FINNIFTY', 'NIFTYBANK', 'NASDAQ'];

// Pre-loaded at server startup
const INDEX_STORE = {};

class IndexService {
  constructor() {
    this._preload();
  }

  /**
   * Get parsed index data by name.
   * @param {string} name  e.g. "NIFTY50"
   */
  get(name) {
    const key = name.toUpperCase();
    if (!INDEX_STORE[key]) {
      const err = new Error(`Index '${name}' not found. Valid options: ${VALID_NAMES.join(', ')}`);
      err.status = 404;
      throw err;
    }
    return INDEX_STORE[key];
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _preload() {
    for (const name of VALID_NAMES) {
      const filePath = path.join(DATA_DIR, `${name}.csv`);
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          INDEX_STORE[name] = this._parseCSV(raw, name);
          logger.info(`Index loaded: ${name} (${INDEX_STORE[name].totalRows} rows)`);
        } else {
          INDEX_STORE[name] = this._synthetic(name);
          logger.warn(`CSV not found for ${name} – synthetic data generated`);
        }
      } catch (err) {
        logger.error(`Failed to load ${name}: ${err.message}`);
        INDEX_STORE[name] = this._synthetic(name);
      }
    }
  }

  _parseCSV(raw, name) {
    const lines   = raw.trim().split('\n');
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, ''));

    const ohlcv = lines
      .slice(1)
      .map((line) => {
        const cols = line.split(',');
        const row  = {};
        headers.forEach((h, i) => { row[h] = cols[i]?.trim() ?? ''; });

        const close = parseFloat(row.close || row.adjclose);
        if (isNaN(close)) return null;

        const d = new Date(row.date || row.datetime);
        if (isNaN(d.getTime())) return null;

        return {
          time:     Math.floor(d.getTime() / 1000),
          date:     d.toISOString().split('T')[0],
          open:     safeNum(row.open,   2) ?? close,
          high:     safeNum(row.high,   2) ?? close,
          low:      safeNum(row.low,    2) ?? close,
          close,
          adjClose: safeNum(row.adjclose, 2) ?? close,
          volume:   parseInt(row.volume, 10) || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    return this._enrich(ohlcv, name);
  }

  _enrich(ohlcv, name) {
    if (!ohlcv.length) {
      return { name, ohlcv: [], priceDiff: null, pctDiff: null, latestClose: null, totalRows: 0 };
    }
    const first = ohlcv[0].close;
    const last  = ohlcv[ohlcv.length - 1].close;
    return {
      name,
      ohlcv,
      latestClose: safeNum(last,  2),
      firstClose:  safeNum(first, 2),
      priceDiff:   safeNum(last - first, 2),
      pctDiff:     safeNum(pctChange(last, first), 2),
      totalRows:   ohlcv.length,
    };
  }

  _synthetic(name) {
    const BASE = { NIFTY50: 22000, FINNIFTY: 21000, NIFTYBANK: 47000, NASDAQ: 16000 };
    let price   = BASE[name] || 10000;
    const ohlcv = [];
    const start = new Date('2020-01-01');

    for (let i = 0; i < 1500; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;  // skip weekends

      const change = (Math.random() - 0.48) * price * 0.012;
      price = Math.max(price + change, 100);

      const o = safeNum(price * (1 - Math.random() * 0.004), 2);
      const h = safeNum(price * (1 + Math.random() * 0.008), 2);
      const l = safeNum(price * (1 - Math.random() * 0.008), 2);
      const c = safeNum(price, 2);

      ohlcv.push({
        time:   Math.floor(d.getTime() / 1000),
        date:   d.toISOString().split('T')[0],
        open:   o, high: h, low: l, close: c,
        volume: Math.floor(Math.random() * 8_000_000 + 1_000_000),
      });
    }
    return this._enrich(ohlcv, name);
  }
}

module.exports = new IndexService();