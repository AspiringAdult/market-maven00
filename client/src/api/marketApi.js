/**
 * marketApi.js — Multi-provider data engine with 30-second localStorage cache.
 *
 * THE BUG THAT CAUSED "NO DATA" (confirmed from live API response)
 * ────────────────────────────────────────────────────────────────
 * Every backend endpoint wraps its payload in an envelope:
 *   { "success": true, "data": { ...actual payload... } }
 *
 * Proof — live API response at /api/stock/AAPL/quote:
 *   { "success": true, "data": { "symbol": "AAPL", "price": 257.46, ... } }
 *
 * The previous marketApi.js did:
 *   (await backendHttp.get('/stock/AAPL/quote')).data
 *   → { success: true, data: { symbol: 'AAPL', price: 257.46 } }
 *
 * Components read quote.price from this → undefined.
 * chart got history = {success:true,data:[...]} → length check failed → "No chart data".
 * Everything silently rendered empty state.
 *
 * Fix: unwrap(response) = response.data?.data ?? response.data
 * Applied to every backend fetch: fetchQuote, fetchHistory, fetchTerminal, fetchIndices.
 */
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const CACHE_TTL  = 30_000;
const TWELVE_KEY = import.meta.env?.VITE_TWELVEDATA_API_KEY || 'demo';

// ── Axios instances ───────────────────────────────────────────────────────────
const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? '';

const backendHttp = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 25_000,
});

backendHttp.interceptors.response.use(
  (response) => response,
  (err) => Promise.reject(new Error(
    err.response?.data?.error || err.message || 'API error',
  )),
);

const twelveHttp = axios.create({
  baseURL: 'https://api.twelvedata.com',
  timeout: 15_000,
});

// ── Envelope unwrapper ────────────────────────────────────────────────────────
/**
 * Backend always responds: { success: true, data: <payload> }
 *
 * axios response object:
 *   response.data        = { success: true, data: <payload> }   ← HTTP body
 *   response.data.data   = <payload>                            ← what we need
 *
 * unwrap() extracts <payload>, falling back to the body itself
 * so this is safe for any endpoint shape.
 */
function unwrap(response) {
  const body = response?.data;
  return body?.data ?? body;
}

// ── localStorage cache ────────────────────────────────────────────────────────
function cGet(key) {
  try {
    const raw = localStorage.getItem(`mm_${key}`);
    if (!raw) return null;
    const { ts, d } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`mm_${key}`); return null; }
    return d;
  } catch { return null; }
}

function cSet(key, d) {
  try { localStorage.setItem(`mm_${key}`, JSON.stringify({ ts: Date.now(), d })); }
  catch { /* storage quota */ }
}

export function cacheClear(pat = '') {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('mm_') && k.includes(pat))
    .forEach((k) => localStorage.removeItem(k));
}

// ── Provider helpers ──────────────────────────────────────────────────────────
const isIndian = (s) => /\.(NS|NSE|BSE)$/i.test(s);
const to12     = (s) => s.replace(/\.(NS|NSE|BSE)$/i, (_, x) => `:${x.toUpperCase()}`);
const fNum     = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

// ── TwelveData — quote ────────────────────────────────────────────────────────
async function _12quote(symbol) {
  const { data } = await twelveHttp.get('/quote', {
    params: { symbol: to12(symbol), apikey: TWELVE_KEY },
  });
  if (data.status === 'error') throw new Error(data.message || `Not found: ${symbol}`);
  const price = fNum(data.close) ?? 0;
  const prev  = fNum(data.previous_close) ?? price;
  return {
    symbol,
    name:           data.name || symbol,
    price,
    previousClose:  prev,
    open:           fNum(data.open),
    dayHigh:        fNum(data.high),
    dayLow:         fNum(data.low),
    week52High:     fNum(data['52_week']?.high),
    week52Low:      fNum(data['52_week']?.low),
    volume:         parseInt(data.volume) || 0,
    marketCap:      null,
    currency:       data.currency || 'INR',
    exchange:       data.exchange || 'NSE',
    changeToday:    price - prev,
    changePctToday: prev ? ((price - prev) / prev) * 100 : 0,
    timestamp:      Date.now(),
  };
}

// ── TwelveData — history ──────────────────────────────────────────────────────
async function _12history(symbol, range = '1y') {
  const sizes = { '1mo':30,'3mo':90,'6mo':180,'1y':365,'2y':730,'5y':1825,'max':5000 };
  const { data } = await twelveHttp.get('/time_series', {
    params: { symbol: to12(symbol), interval: '1day', outputsize: sizes[range] || 365, apikey: TWELVE_KEY },
  });
  if (data.status === 'error') throw new Error(data.message || `No history: ${symbol}`);
  return (data.values || []).reverse().map((d) => {
    const dt = new Date(d.datetime);
    return {
      time:     Math.floor(dt.getTime() / 1000),
      date:     d.datetime,
      open:     fNum(d.open)  ?? 0,
      high:     fNum(d.high)  ?? 0,
      low:      fNum(d.low)   ?? 0,
      close:    fNum(d.close) ?? 0,
      adjClose: fNum(d.close) ?? 0,
      volume:   parseInt(d.volume) || 0,
    };
  });
}

// ── Public: fetchTerminal ─────────────────────────────────────────────────────
export async function fetchTerminal(symbol, range = '1y') {
  const key = `term_${symbol}_${range}`;
  const hit = cGet(key);
  if (hit) return hit;

  let result;

  if (isIndian(symbol)) {
    const t0 = Date.now();
    const [q, h] = await Promise.allSettled([_12quote(symbol), _12history(symbol, range)]);
    result = {
      symbol, range,
      quote:      q.status === 'fulfilled' ? q.value : null,
      quoteError: q.status === 'rejected'  ? q.reason?.message : null,
      history:    h.status === 'fulfilled' ? h.value : null,
      historyError: h.status === 'rejected' ? h.reason?.message : null,
      indicators: null, fundamentals: null, sentiment: null,
      meta: {
        fetchedAt: new Date().toISOString(),
        elapsedMs: Date.now() - t0,
        candleCount: h.status === 'fulfilled' ? (h.value?.length ?? 0) : 0,
        provider: 'TwelveData',
      },
    };
  } else {
    const t0  = Date.now();
    const res = await backendHttp.get(`/terminal/${symbol.toUpperCase()}`, { params: { range } });
    // Terminal: { success, data: { quote, history, indicators, fundamentals, sentiment } }
    const payload = unwrap(res);
    result = {
      ...payload,
      meta: { ...(payload?.meta ?? {}), provider: 'Stooq+Yahoo', elapsedMs: Date.now() - t0 },
    };
  }

  cSet(key, result);
  return result;
}

// ── Public: fetchQuote ────────────────────────────────────────────────────────
export async function fetchQuote(symbol) {
  const key = `q_${symbol}`;
  const hit = cGet(key);
  if (hit) return hit;

  // Backend: { success: true, data: { symbol, price, ... } }
  // unwrap() gives us the inner { symbol, price, ... }
  const d = isIndian(symbol)
    ? await _12quote(symbol)
    : unwrap(await backendHttp.get(`/stock/${symbol.toUpperCase()}/quote`));

  cSet(key, d);
  return d;
}

// ── Public: fetchHistory ──────────────────────────────────────────────────────
export async function fetchHistory(symbol, range = '1y') {
  const key = `h_${symbol}_${range}`;
  const hit = cGet(key);
  if (hit) return hit;

  // Backend: { success: true, data: [ ...OHLCV rows... ] }
  // unwrap() gives us the inner array
  const d = isIndian(symbol)
    ? await _12history(symbol, range)
    : unwrap(await backendHttp.get(`/stock/${symbol.toUpperCase()}/history`, { params: { range } }));

  cSet(key, d);
  return d;
}

// ── Public: fetchMultiQuote ───────────────────────────────────────────────────
export async function fetchMultiQuote(symbols) {
  const results = await Promise.allSettled(symbols.map(fetchQuote));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { symbol: symbols[i], price: null, changePctToday: null, error: r.reason?.message },
  );
}

// ── Public: fetchIndices ──────────────────────────────────────────────────────
const INDEX_FALLBACK = [
  { symbol: 'SPX',           name: 'S&P 500',    currency: 'USD' },
  { symbol: 'IXIC',          name: 'NASDAQ',     currency: 'USD' },
  { symbol: 'DJI',           name: 'Dow Jones',  currency: 'USD' },
  { symbol: 'NIFTY50:NSE',   name: 'NIFTY 50',   currency: 'INR' },
  { symbol: 'BANKNIFTY:NSE', name: 'BANK NIFTY', currency: 'INR' },
];

export async function fetchIndices() {
  const key = 'indices';
  const hit = cGet(key);
  if (hit) return hit;

  // ① Backend (preferred — server-side cached, no CORS issues)
  try {
    const res  = await backendHttp.get('/indices');
    const payload = unwrap(res);
    const arr  = Array.isArray(payload) ? payload : null;
    if (arr?.length) { cSet(key, arr); return arr; }
  } catch (err) {
    console.warn('[fetchIndices] Backend failed, falling back to TwelveData:', err.message);
  }

  // ② TwelveData direct (fallback)
  const results = await Promise.allSettled(
    INDEX_FALLBACK.map(async ({ symbol, name, currency }) => {
      const { data } = await twelveHttp.get('/quote', { params: { symbol, apikey: TWELVE_KEY } });
      if (data.status === 'error') throw new Error(data.message);
      const price = fNum(data.close) ?? 0;
      const prev  = fNum(data.previous_close) ?? price;
      return { symbol, name, currency, price, change: price - prev,
               changePct: prev ? ((price - prev) / prev) * 100 : 0 };
    }),
  );

  const d = INDEX_FALLBACK.map((m, i) =>
    results[i].status === 'fulfilled'
      ? results[i].value
      : { ...m, price: null, change: null, changePct: null, error: results[i].reason?.message },
  );
  cSet(key, d);
  return d;
}

export default backendHttp;