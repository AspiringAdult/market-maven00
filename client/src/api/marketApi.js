
import axios from 'axios';

const CACHE_TTL   = 30_000;   // 30 s client-side localStorage cache
const TWELVE_KEY  = import.meta.env?.VITE_TWELVEDATA_API_KEY || 'demo';
const TWELVE_BASE = 'https://api.twelvedata.com';


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

const twelveHttp = axios.create({ baseURL: TWELVE_BASE, timeout: 15_000 });

function cGet(key) {
  try {
    const raw = localStorage.getItem(`mm_${key}`);
    if (!raw) return null;
    const { ts, d } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(`mm_${key}`);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function cSet(key, d) {
  try {
    localStorage.setItem(`mm_${key}`, JSON.stringify({ ts: Date.now(), d }));
  } catch {
  }
}

export function cacheClear(pat = '') {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('mm_') && k.includes(pat))
    .forEach((k) => localStorage.removeItem(k));
}

const isIndian = (s) => /\.(NS|NSE|BSE)$/i.test(s);
const to12     = (s) => s.replace(/\.(NS|NSE|BSE)$/i, (_, x) => `:${x.toUpperCase()}`);
const fNum     = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

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
    volume:         parseInt(data.volume)  || 0,
    marketCap:      null,
    currency:       data.currency || 'INR',
    exchange:       data.exchange || 'NSE',
    changeToday:    price - prev,
    changePctToday: prev ? ((price - prev) / prev) * 100 : 0,
    timestamp:      Date.now(),
  };
}

async function _12history(symbol, range = '1y') {
  const sizes = { '1mo':30,'3mo':90,'6mo':180,'1y':365,'2y':730,'5y':1825,'max':5000 };
  const { data } = await twelveHttp.get('/time_series', {
    params: {
      symbol:     to12(symbol),
      interval:   '1day',
      outputsize: sizes[range] || 365,
      apikey:     TWELVE_KEY,
    },
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

export async function fetchTerminal(symbol, range = '1y') {
  const key = `term_${symbol}_${range}`;
  const hit = cGet(key);
  if (hit) return hit;

  let result;

  if (isIndian(symbol)) {
    const t0 = Date.now();
    const [q, h] = await Promise.allSettled([
      _12quote(symbol),
      _12history(symbol, range),
    ]);
    result = {
      symbol, range,
      quote:             q.status === 'fulfilled' ? q.value : null,
      quoteError:        q.status === 'rejected'  ? q.reason?.message : null,
      history:           h.status === 'fulfilled' ? h.value : null,
      historyError:      h.status === 'rejected'  ? h.reason?.message : null,
      indicators:        null,
      indicatorsError:   'Technical indicators are computed server-side',
      fundamentals:      null,
      fundamentalsError: 'Fundamentals are fetched server-side',
      sentiment:         null,
      sentimentError:    null,
      meta: {
        fetchedAt:   new Date().toISOString(),
        elapsedMs:   Date.now() - t0,
        candleCount: h.status === 'fulfilled' ? (h.value?.length ?? 0) : 0,
        provider:    'TwelveData',
      },
    };
  } else {
    const t0  = Date.now();
    const res = await backendHttp.get(`/terminal/${symbol.toUpperCase()}`, { params: { range } });
    const payload = res.data;
    result = {
      ...payload,
      meta: {
        ...(payload?.meta ?? {}),
        provider:  'Stooq+Yahoo',
        elapsedMs: Date.now() - t0,
      },
    };
  }

  cSet(key, result);
  return result;
}

export async function fetchQuote(symbol) {
  const key = `q_${symbol}`;
  const hit = cGet(key);
  if (hit) return hit;

  const d = isIndian(symbol)
    ? await _12quote(symbol)
    : (await backendHttp.get(`/stock/${symbol.toUpperCase()}/quote`)).data;  // FIX: .data

  cSet(key, d);
  return d;
}

export async function fetchHistory(symbol, range = '1y') {
  const key = `h_${symbol}_${range}`;
  const hit = cGet(key);
  if (hit) return hit;

  const d = isIndian(symbol)
    ? await _12history(symbol, range)
    : (await backendHttp.get(`/stock/${symbol.toUpperCase()}/history`, { params: { range } })).data;  // FIX: .data

  cSet(key, d);
  return d;
}

export async function fetchMultiQuote(symbols) {
  const results = await Promise.allSettled(symbols.map(fetchQuote));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { symbol: symbols[i], price: null, changePctToday: null, error: r.reason?.message },
  );
}


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

  try {
    const res = await backendHttp.get('/indices');
    const payload = res.data;
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data) ? payload.data : null;

    if (arr?.length) {
      cSet(key, arr);
      return arr;
    }
  } catch (backendErr) {
    console.warn('[fetchIndices] Backend failed, using TwelveData direct:', backendErr.message);
  }

  const results = await Promise.allSettled(
    INDEX_FALLBACK.map(async ({ symbol, name, currency }) => {
      const { data } = await twelveHttp.get('/quote', { params: { symbol, apikey: TWELVE_KEY } });
      if (data.status === 'error') throw new Error(data.message);
      const price = fNum(data.close)          ?? 0;
      const prev  = fNum(data.previous_close) ?? price;
      return {
        symbol, name, currency,
        price,
        change:    price - prev,
        changePct: prev ? ((price - prev) / prev) * 100 : 0,
      };
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