import { useEffect, useState, useCallback } from 'react';
import { fetchMultiQuote } from '../api/marketApi';
import { Grid3x3, RefreshCw } from 'lucide-react';

const HEATMAP_TICKERS = [
  { symbol: 'AAPL',  name: 'Apple',     sector: 'Tech'    },
  { symbol: 'MSFT',  name: 'Microsoft', sector: 'Tech'    },
  { symbol: 'NVDA',  name: 'Nvidia',    sector: 'Tech'    },
  { symbol: 'GOOGL', name: 'Alphabet',  sector: 'Tech'    },
  { symbol: 'META',  name: 'Meta',      sector: 'Tech'    },
  { symbol: 'AMZN',  name: 'Amazon',    sector: 'Consumer'},
  { symbol: 'TSLA',  name: 'Tesla',     sector: 'Auto'    },
  { symbol: 'JPM',   name: 'JPMorgan',  sector: 'Finance' },
  { symbol: 'V',     name: 'Visa',      sector: 'Finance' },
  { symbol: 'JNJ',   name: 'J&J',       sector: 'Health'  },
  { symbol: 'WMT',   name: 'Walmart',   sector: 'Consumer'},
  { symbol: 'XOM',   name: 'Exxon',     sector: 'Energy'  },
];

// Map % change → colour
function pctToColor(pct) {
  if (pct == null) return { bg: '#1f2f45', text: '#4a6080', border: '#2a3f5a' };
  if (pct >=  4)   return { bg: '#064e35', text: '#10b981', border: '#10b981' };
  if (pct >=  2)   return { bg: '#053d29', text: '#10b981', border: '#10b98166' };
  if (pct >=  0.5) return { bg: '#042e1f', text: '#10b981', border: '#10b98133' };
  if (pct >= -0.5) return { bg: '#1a2436', text: '#7a94b0', border: '#2a3f5a' };
  if (pct >= -2)   return { bg: '#2d0a14', text: '#f43f5e', border: '#f43f5e33' };
  if (pct >= -4)   return { bg: '#3c0d1a', text: '#f43f5e', border: '#f43f5e66' };
  return             { bg: '#4c0a1a', text: '#f43f5e', border: '#f43f5e' };
}

function HeatCell({ ticker, quote, onClick }) {
  const pct    = quote?.changePctToday ?? null;
  const colors = pctToColor(pct);
  const price  = quote?.price;

  return (
    <button
      onClick={() => onClick(ticker.symbol)}
      title={`${ticker.name} — click to load`}
      className="relative rounded-xl border p-3 flex flex-col justify-between cursor-pointer
                 transition-all duration-200 hover:scale-[1.03] hover:z-10 active:scale-100"
      style={{
        background:   colors.bg,
        borderColor:  colors.border,
        minHeight:    '88px',
      }}
    >
      {/* Symbol + sector */}
      <div>
        <div className="font-mono text-sm font-bold" style={{ color: colors.text }}>
          {ticker.symbol}
        </div>
        <div className="font-mono text-[9px] opacity-60" style={{ color: colors.text }}>
          {ticker.sector}
        </div>
      </div>

      {/* Price + change */}
      <div>
        <div className="font-mono text-xs font-bold" style={{ color: colors.text }}>
          {price != null ? `$${price.toFixed(2)}` : '—'}
        </div>
        <div className="font-mono text-xs font-bold" style={{ color: colors.text }}>
          {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
        </div>
      </div>

      {/* Error indicator */}
      {quote?.error && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center">
          <span className="font-mono text-[9px] text-muted">offline</span>
        </div>
      )}
    </button>
  );
}

export default function MarketHeatmap({ onSelectSymbol }) {
  const [quotes,    setQuotes]  = useState({});
  const [loading,   setLoading] = useState(false);
  const [lastUpdate,setLast]    = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const syms    = HEATMAP_TICKERS.map((t) => t.symbol);
      const results = await fetchMultiQuote(syms);
      const map = {};
      results.forEach((q) => { if (q?.symbol) map[q.symbol] = q; });
      setQuotes(map);
      setLast(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Grid3x3 size={13} className="text-muted" />
          <span className="panel-label">Market Heatmap</span>
          {lastUpdate && (
            <span className="font-mono text-[9px] text-muted">
              · {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="p-1.5 rounded-lg text-muted hover:text-up hover:bg-up/10 transition-all disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {HEATMAP_TICKERS.map((ticker) => (
          <HeatCell
            key={ticker.symbol}
            ticker={ticker}
            quote={quotes[ticker.symbol]}
            onClick={onSelectSymbol}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[9px] text-muted">% Change:</span>
        {[
          { label: '≥ +4%',   bg: '#064e35', text: '#10b981' },
          { label: '+2–4%',   bg: '#053d29', text: '#10b981' },
          { label: '0–2%',    bg: '#042e1f', text: '#10b981' },
          { label: '±0.5%',   bg: '#1a2436', text: '#7a94b0' },
          { label: '−2–0%',   bg: '#2d0a14', text: '#f43f5e' },
          { label: '≤ −4%',   bg: '#4c0a1a', text: '#f43f5e' },
        ].map((item) => (
          <div
            key={item.label}
            className="font-mono text-[9px] px-2 py-0.5 rounded"
            style={{ background: item.bg, color: item.text }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}