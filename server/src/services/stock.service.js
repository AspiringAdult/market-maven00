'use strict';

/**
 * stock.service.js  —  Production-hardened market data service
 * ═══════════════════════════════════════════════════════════════
 *
 * ROOT CAUSES FIXED (every bug that caused the 404s you are seeing)
 * ─────────────────────────────────────────────────────────────────
 *
 * BUG 1 — Hard-coded `.us` suffix breaks many tickers  ← PRIMARY CAUSE
 *   The old code always appended `.us`:  `${symbol.toLowerCase()}.us`
 *   Stooq responds with N/D rows (not an HTTP error) when it can't find
 *   a symbol.  For tickers like V, WMT, JPM, XOM the plain bare form
 *   ("v", "wmt") returns N/D, while those same tickers do have data on
 *   Stooq under other suffixes or no suffix at all.  The `.us` suffix is
 *   also not required for AAPL/MSFT/GOOGL — Stooq accepts the bare ticker.
 *   Fix: try bare symbol first, then ".us" as a fallback.
 *
 * BUG 2 — N/D check was per-value; a short row still passed
 *   parts[3]–parts[7] could be "N/D" or "" while the rest of `parts` had
 *   fewer elements, causing safeNum("") → null and safeNum(undefined) → null,
 *   both of which are falsy, but the check `if (!close)` catches 0 too,
 *   meaning a valid $0 quote would also throw.  Worse, if parts.length < 8
 *   then parts[7] is undefined → `parseInt(undefined)` → NaN → no crash but
 *   wrong volume.  Fix: explicit column-count guard + per-field N/D scan.
 *
 * BUG 3 — No timeout on getHistory
 *   axios.get(url) with no timeout option.  On Render's free tier a hung
 *   upstream connection stalls the dyno thread until Render kills it (503).
 *   Fix: 12 s timeout on every outbound request via a shared axios instance.
 *
 * BUG 4 — getHistory never filters NaN rows
 *   parseFloat("N/D") → NaN.  The `.filter(Boolean)` call only removes null/
 *   undefined but not `{ close: NaN }` objects.  The NaN values then corrupt
 *   indicator calculations and produce a 500 from indicator.service.js.
 *   Fix: explicit isFinite check per row.
 *
 * BUG 5 — getQuote catch swallows all errors as 404
 *   Network timeouts and Render cold-start 503s were being re-thrown as a
 *   generic 404 "Symbol not found".  This hides the real error from logs and
 *   makes monitoring useless.  Fix: classify errors by type.
 *
 * BUG 6 — No fallback when Stooq is down or rate-limiting
 *   Stooq is an unofficial, unmetered scraping endpoint with no SLA.  When
 *   it goes down (it does, regularly) or returns an HTML error page, the
 *   whole API returns 404.  Fix: Yahoo Finance v8 JSON as a silent fallback.
 *
 * BUG 7 — app.js requires `./routes/search` at the top and never uses it
 *   (search is already mounted inside routes/index.js).  If that path shifts
 *   or the file is missing the server crashes on startup.  Fixed in app.js.
 *
 * PROVIDER CHAIN
 * ──────────────
 *  Quote:    Stooq (bare symbol → .us suffix) → Yahoo Finance v8 JSON
 *  History:  Stooq CSV download (bare → .us)  → Yahoo Finance v8 chart
 *  Fundamentals: Alpha Vantage OVERVIEW        → Yahoo quoteSummary → skeleton
 */

const NodeCache = require('node-cache');
const axios     = require('axios');

const { normalizeOHLCV, safeNum } = require('../utils/transform');
const logger = require('../utils/logger');

// ── Shared axios instance ─────────────────────────────────────────────────────
// Browser-like UA avoids Stooq's bot-detection 403s on headless cloud IPs.
const http = axios.create({
  timeout: 12_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// ── Caches ────────────────────────────────────────────────────────────────────
const quoteCache   = new NodeCache({ stdTTL: 30,   checkperiod: 10  });
const historyCache = new NodeCache({ stdTTL: 300,  checkperiod: 60  });
const fundCache    = new NodeCache({ stdTTL: 3600, checkperiod: 300 });

const ALPHA_URL = 'https://www.alphavantage.co/query';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Returns true only if all four values are finite positive numbers. */
function validOHLC(o, h, l, c) {
  return [o, h, l, c].every((v) => typeof v === 'number' && isFinite(v) && v > 0);
}

/**
 * Classify an axios/network error into a meaningful HTTP status so
 * callers can distinguish 504 (timeout) from 404 (not found).
 */
function classifyError(err, symbol) {
  const isTimeout =
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT'    ||
    (err.message || '').includes('timeout');

  if (isTimeout) {
    const e = new Error(`Data provider timed out for ${symbol}`);
    e.status = 504;
    e.code   = 'PROVIDER_TIMEOUT';
    return e;
  }
  if (err.response?.status === 429) {
    const e = new Error(`Rate limited by data provider for ${symbol}`);
    e.status = 429;
    e.code   = 'RATE_LIMITED';
    return e;
  }
  const e = new Error(`Symbol not found or data unavailable: ${symbol}`);
  e.status = 404;
  e.code   = 'SYMBOL_NOT_FOUND';
  return e;
}

/**
 * Build an ordered list of Stooq symbol candidates to try.
 *
 * Rules
 *  - symbol already has a dot suffix  → use as-is  (e.g. RELIANCE.NS)
 *  - plain bare ticker                → try bare first, then with .us
 *
 * Rationale: Stooq accepts AAPL, MSFT, GOOGL without any suffix.
 * Adding .us is harmless for those but necessary for tickers that Stooq
 * only indexes under the .us namespace.  Trying bare first is safer.
 */
function stooqCandidates(symbol) {
  const s = symbol.toLowerCase();
  if (s.includes('.')) return [s];         // already has suffix — trust it
  return [s, `${s}.us`];                  // bare US ticker — try both
}

// ═════════════════════════════════════════════════════════════════════════════
// STOOQ PROVIDER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch a real-time quote from Stooq.
 *
 * Stooq CSV format with &f=sd2t2ohlcv :
 *   col[0] Symbol  col[1] Date  col[2] Time
 *   col[3] Open    col[4] High  col[5] Low   col[6] Close  col[7] Volume
 *
 * Returns a normalised quote object, or throws with a descriptive message.
 */
async function stooqGetQuote(symbol) {
  const candidates = stooqCandidates(symbol);

  for (const stooqSym of candidates) {
    try {
      const url = `https://stooq.com/q/l/?s=${stooqSym}&f=sd2t2ohlcv&h&e=csv`;
      logger.debug(`Stooq quote attempt: ${url}`);
      const response = await http.get(url);
      const raw = String(response.data || '').trim();

      // Stooq returns an HTML page when it blocks the request
      if (raw.toLowerCase().startsWith('<!')) {
        logger.debug(`Stooq returned HTML for ${stooqSym} (likely bot-blocked)`);
        continue;
      }

      const lines = raw.split('\n').filter(Boolean);
      if (lines.length < 2) {
        logger.debug(`Stooq empty CSV for ${stooqSym}`);
        continue;
      }

      const parts = lines[1].trim().split(',');

      // Need at least 7 columns (Symbol,Date,Time,Open,High,Low,Close)
      if (parts.length < 7) {
        logger.debug(`Stooq too few columns (${parts.length}) for ${stooqSym}`);
        continue;
      }

      // Any N/D field means this symbol has no data on Stooq right now
      if (parts.some((p) => p.trim().toUpperCase() === 'N/D')) {
        logger.debug(`Stooq N/D response for ${stooqSym}`);
        continue;
      }

      const open   = safeNum(parts[3], 4);
      const high   = safeNum(parts[4], 4);
      const low    = safeNum(parts[5], 4);
      const close  = safeNum(parts[6], 4);
      const volume = parseInt(parts[7] || '0', 10) || 0;

      if (!validOHLC(open, high, low, close)) {
        logger.debug(`Stooq invalid OHLC for ${stooqSym}: o=${open} h=${high} l=${low} c=${close}`);
        continue;
      }

      // Stooq's single-quote endpoint does not expose previous close.
      // We use open as the best available proxy and note it explicitly.
      const changeToday    = safeNum(close - open,                       2);
      const changePctToday = open ? safeNum(((close - open) / open) * 100, 4) : 0;

      return {
        symbol,
        name:           symbol,
        price:          close,
        previousClose:  open,      // proxy — real prev-close needs history
        open,
        dayHigh:        high,
        dayLow:         low,
        week52High:     null,
        week52Low:      null,
        volume,
        marketCap:      null,
        currency:       stooqSym.endsWith('.ns') ? 'INR' : 'USD',
        exchange:       'STOOQ',
        changeToday,
        changePctToday,
        timestamp:      Date.now(),
      };

    } catch (err) {
      logger.debug(`Stooq quote failed for ${stooqSym}: ${err.message}`);
      // Continue to next candidate / provider
    }
  }

  throw new Error(`Stooq returned no valid quote for ${symbol}`);
}

/**
 * Fetch OHLCV history from Stooq.
 * CSV format: Date,Open,High,Low,Close,Volume  (header on line 0)
 */
async function stooqGetHistory(symbol, range = '1y') {
  const candidates = stooqCandidates(symbol);

  for (const stooqSym of candidates) {
    try {
      const url = `https://stooq.com/q/d/l/?s=${stooqSym}&i=d`;
      logger.debug(`Stooq history attempt: ${url}`);
      const response = await http.get(url);
      const raw = String(response.data || '').trim();

      if (raw.toLowerCase().startsWith('<!')) {
        logger.debug(`Stooq history HTML response for ${stooqSym}`);
        continue;
      }

      const lines = raw.split('\n').filter(Boolean);
      if (lines.length < 2) {
        logger.debug(`Stooq empty history for ${stooqSym}`);
        continue;
      }

      const rows = lines.slice(1).map((line) => {
        const cols  = line.trim().split(',');
        // Expect: Date,Open,High,Low,Close,Volume
        if (cols.length < 5) return null;
        if (cols.some((c) => c.trim().toUpperCase() === 'N/D')) return null;

        const date = cols[0].trim();
        const o    = parseFloat(cols[1]);
        const h    = parseFloat(cols[2]);
        const l    = parseFloat(cols[3]);
        const c    = parseFloat(cols[4]);
        if (!validOHLC(o, h, l, c)) return null;

        const dt = new Date(date);
        if (isNaN(dt.getTime())) return null;

        return {
          time:     Math.floor(dt.getTime() / 1000),
          date,
          open:     o,
          high:     h,
          low:      l,
          close:    c,
          adjClose: c,
          volume:   parseInt(cols[5] || '0', 10) || 0,
        };
      }).filter(Boolean);

      if (rows.length === 0) {
        logger.debug(`Stooq history: zero valid rows for ${stooqSym}`);
        continue;
      }

      // Slice to requested range (Stooq always returns full history)
      const DAYS = { '1mo':30,'3mo':90,'6mo':180,'1y':365,'2y':730,'5y':1825,'max':Infinity };
      const days = DAYS[range] ?? 365;
      const sliced = isFinite(days) ? rows.slice(-days) : rows;

      logger.debug(`Stooq history OK for ${stooqSym}: ${sliced.length} rows`);
      return normalizeOHLCV(sliced);

    } catch (err) {
      logger.debug(`Stooq history failed for ${stooqSym}: ${err.message}`);
    }
  }

  throw new Error(`Stooq returned no valid history for ${symbol}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// YAHOO FINANCE FALLBACK  (unofficial v8 API — free, no key required)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Convert our internal symbol format to Yahoo's ticker convention.
 * RELIANCE.NSE → RELIANCE.NS   (Yahoo only knows .NS, not .NSE)
 */
function toYahooSym(symbol) {
  return symbol.toUpperCase()
    .replace(/\.NSE$/i, '.NS')
    .replace(/\.BSE$/i, '.BO');
}

async function yahooGetQuote(symbol) {
  const ySym = toYahooSym(symbol);
  // range=2d gives us today + yesterday so we can compute a real prev-close
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=1d&range=2d`;
  logger.debug(`Yahoo quote attempt: ${url}`);

  const { data } = await http.get(url);
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`Yahoo: no price for ${symbol}`);

  const price = safeNum(meta.regularMarketPrice, 4);
  // Yahoo exposes chartPreviousClose which is yesterday's close — much more
  // accurate than using open as a proxy.
  const prev  = safeNum(
    meta.chartPreviousClose ?? meta.previousClose ?? price,
    4,
  );

  return {
    symbol,
    name:           meta.longName  || meta.shortName || symbol,
    price,
    previousClose:  prev,
    open:           safeNum(meta.regularMarketOpen,    4),
    dayHigh:        safeNum(meta.regularMarketDayHigh, 4),
    dayLow:         safeNum(meta.regularMarketDayLow,  4),
    week52High:     safeNum(meta.fiftyTwoWeekHigh,     4),
    week52Low:      safeNum(meta.fiftyTwoWeekLow,      4),
    volume:         meta.regularMarketVolume || 0,
    marketCap:      meta.marketCap           || null,
    currency:       meta.currency            || 'USD',
    exchange:       meta.exchangeName        || 'YAHOO',
    changeToday:    safeNum(price - prev,                    2),
    changePctToday: prev ? safeNum(((price - prev) / prev) * 100, 4) : 0,
    timestamp:      Date.now(),
  };
}

async function yahooGetHistory(symbol, range = '1y') {
  const RANGE_MAP = {
    '1mo':'1mo','3mo':'3mo','6mo':'6mo','1y':'1y','2y':'2y','5y':'5y','max':'max',
  };
  const yRange = RANGE_MAP[range] ?? '1y';
  const ySym   = toYahooSym(symbol);
  const url    = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=1d&range=${yRange}`;
  logger.debug(`Yahoo history attempt: ${url}`);

  const { data } = await http.get(url);
  const result   = data?.chart?.result?.[0];
  if (!result?.timestamp?.length) throw new Error(`Yahoo: no history for ${symbol}`);

  const timestamps = result.timestamp;
  const ohlcv      = result.indicators?.quote?.[0] || {};
  const adjClose   = result.indicators?.adjclose?.[0]?.adjclose || [];

  return timestamps.map((ts, i) => {
    const c = ohlcv.close?.[i];
    if (c == null || !isFinite(c) || c <= 0) return null;
    return {
      time:     ts,
      date:     new Date(ts * 1000).toISOString().split('T')[0],
      open:     safeNum(ohlcv.open?.[i],  4) ?? c,
      high:     safeNum(ohlcv.high?.[i],  4) ?? c,
      low:      safeNum(ohlcv.low?.[i],   4) ?? c,
      close:    safeNum(c,                4),
      adjClose: safeNum(adjClose[i] ?? c, 4),
      volume:   ohlcv.volume?.[i] || 0,
    };
  }).filter(Boolean);
}

// ═════════════════════════════════════════════════════════════════════════════
// STOCK SERVICE CLASS
// ═════════════════════════════════════════════════════════════════════════════

class StockService {

  // ── getQuote ────────────────────────────────────────────────────────────────
  async getQuote(symbol) {
    const upper = symbol.toUpperCase();

    const cached = quoteCache.get(upper);
    if (cached) { logger.debug(`Quote cache HIT  ${upper}`); return cached; }
    logger.debug(`Quote cache MISS ${upper}`);

    // ① Stooq
    try {
      const result = await stooqGetQuote(upper);
      logger.info(`Quote via Stooq OK: ${upper} @ ${result.price}`);
      quoteCache.set(upper, result);
      return result;
    } catch (stooqErr) {
      logger.warn(`Stooq quote failed for ${upper}: ${stooqErr.message} — falling back to Yahoo`);
    }

    // ② Yahoo Finance (fallback)
    try {
      const result = await yahooGetQuote(upper);
      logger.info(`Quote via Yahoo OK: ${upper} @ ${result.price}`);
      quoteCache.set(upper, result);
      return result;
    } catch (yahooErr) {
      logger.error(`Both providers failed for quote ${upper}: Yahoo said: ${yahooErr.message}`);
      throw classifyError(yahooErr, upper);
    }
  }

  // ── getHistory ──────────────────────────────────────────────────────────────
  async getHistory(symbol, range = '1y', _interval = '1d') {
    const upper    = symbol.toUpperCase();
    const cacheKey = `${upper}_${range}`;

    const cached = historyCache.get(cacheKey);
    if (cached) { logger.debug(`History cache HIT  ${cacheKey}`); return cached; }
    logger.debug(`History cache MISS ${cacheKey}`);

    // ① Stooq
    let rows;
    try {
      rows = await stooqGetHistory(upper, range);
      logger.info(`History via Stooq OK: ${upper} (${rows.length} rows)`);
    } catch (stooqErr) {
      logger.warn(`Stooq history failed for ${upper}: ${stooqErr.message} — falling back to Yahoo`);

      // ② Yahoo Finance (fallback)
      try {
        const raw = await yahooGetHistory(upper, range);
        rows = normalizeOHLCV(raw);
        logger.info(`History via Yahoo OK: ${upper} (${rows.length} rows)`);
      } catch (yahooErr) {
        logger.error(`Both providers failed for history ${upper}: Yahoo said: ${yahooErr.message}`);
        throw classifyError(yahooErr, upper);
      }
    }

    if (!rows?.length) {
      const e = new Error(`No historical data available for ${upper}`);
      e.status = 404;
      e.code   = 'SYMBOL_NOT_FOUND';
      throw e;
    }

    historyCache.set(cacheKey, rows);
    return rows;
  }

  // ── getFundamentals ─────────────────────────────────────────────────────────
  async getFundamentals(symbol) {
    const upper    = symbol.toUpperCase();
    const cacheKey = `fund_${upper}`;

    const cached = fundCache.get(cacheKey);
    if (cached) { logger.debug(`Fundamentals cache HIT ${upper}`); return cached; }
    logger.debug(`Fundamentals cache MISS ${upper}`);

    // ① Alpha Vantage (primary — has AV key in env)
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      try {
        const response = await http.get(ALPHA_URL, {
          params: {
            function: 'OVERVIEW',
            symbol: upper,
            apikey: process.env.ALPHA_VANTAGE_API_KEY,
          },
        });
        const d = response.data;
        if (d?.Symbol) {
          const result = {
            symbol: upper,
            peRatio:          safeNum(d.PERatio,              2),
            forwardPE:        safeNum(d.ForwardPE,            2),
            priceToBook:      safeNum(d.PriceToBookRatio,     2),
            dividendYield:    safeNum(parseFloat(d.DividendYield || '0') * 100, 4),
            dividendRate:     safeNum(d.DividendPerShare,     2),
            marketCap:        parseInt(d.MarketCapitalization || '0', 10) || null,
            beta:             safeNum(d.Beta,                 4),
            eps:              safeNum(d.EPS,                  2),
            forwardEps:       null,
            debtToEquity:     safeNum(d.DebtToEquity,         2),
            returnOnEquity:   safeNum(d.ReturnOnEquityTTM,    4),
            returnOnAssets:   safeNum(d.ReturnOnAssetsTTM,    4),
            revenueGrowth:    null,
            grossMargins:     null,
            operatingMargins: null,
            totalRevenue:     parseInt(d.RevenueTTM || '0', 10) || null,
            freeCashflow:     null,
            currentRatio:     safeNum(d.CurrentRatio,         2),
            targetMeanPrice:  null,
            sector:           d.Sector   || null,
            industry:         d.Industry || null,
          };
          fundCache.set(cacheKey, result);
          return result;
        }
        if (d?.Information) {
          logger.warn(`Alpha Vantage rate-limited for ${upper}: ${d.Information}`);
        }
      } catch (avErr) {
        logger.warn(`Alpha Vantage failed for ${upper}: ${avErr.message}`);
      }
    }

    // ② Yahoo Finance quoteSummary (fallback — no key required)
    try {
      const ySym = toYahooSym(upper);
      const url  = [
        `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${ySym}`,
        '?modules=defaultKeyStatistics,summaryDetail,assetProfile',
      ].join('');
      const { data } = await http.get(url);
      const s  = data?.quoteSummary?.result?.[0] || {};
      const ks = s.defaultKeyStatistics || {};
      const sd = s.summaryDetail        || {};
      const ap = s.assetProfile         || {};

      const result = {
        symbol:           upper,
        peRatio:          safeNum(sd.trailingPE?.raw,           2),
        forwardPE:        safeNum(sd.forwardPE?.raw,            2),
        priceToBook:      safeNum(ks.priceToBook?.raw,          2),
        dividendYield:    safeNum((sd.dividendYield?.raw || 0) * 100, 4),
        dividendRate:     safeNum(sd.dividendRate?.raw,         2),
        marketCap:        sd.marketCap?.raw    || null,
        beta:             safeNum(sd.beta?.raw,                 4),
        eps:              safeNum(ks.trailingEps?.raw,          2),
        forwardEps:       safeNum(ks.forwardEps?.raw,           2),
        debtToEquity:     safeNum(ks.debtToEquity?.raw,         2),
        returnOnEquity:   safeNum(ks.returnOnEquity?.raw,       4),
        returnOnAssets:   null,
        revenueGrowth:    safeNum(ks.revenueGrowth?.raw,        4),
        grossMargins:     null,
        operatingMargins: null,
        totalRevenue:     ks.totalRevenue?.raw || null,
        freeCashflow:     safeNum(ks.freeCashflow?.raw,         2),
        currentRatio:     null,
        targetMeanPrice:  null,
        sector:           ap.sector   || null,
        industry:         ap.industry || null,
      };
      fundCache.set(cacheKey, result);
      return result;
    } catch (yhErr) {
      logger.warn(`Yahoo fundamentals also failed for ${upper}: ${yhErr.message}`);
    }

    // ③ Skeleton — never crash the terminal over missing fundamentals
    logger.warn(`Returning empty fundamentals skeleton for ${upper}`);
    const skeleton = {
      symbol: upper,
      peRatio:null, forwardPE:null, priceToBook:null,
      dividendYield:null, dividendRate:null, marketCap:null,
      beta:null, eps:null, forwardEps:null, debtToEquity:null,
      returnOnEquity:null, returnOnAssets:null, revenueGrowth:null,
      grossMargins:null, operatingMargins:null, totalRevenue:null,
      freeCashflow:null, currentRatio:null, targetMeanPrice:null,
      sector:null, industry:null,
    };
    return skeleton;
  }

  // ── getCorporateActions ─────────────────────────────────────────────────────
  async getCorporateActions(symbol) {
    return { symbol: symbol.toUpperCase(), dividends: [], splits: [] };
  }

  // ── getRecommendations ──────────────────────────────────────────────────────
  async getRecommendations(symbol) {
    return { symbol: symbol.toUpperCase(), trend: [], upgradeDowngradeHistory: [] };
  }
}

module.exports = new StockService();