import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';
import { useLivePrices } from '../hooks/useLivePrices';
import {
  Star, ArrowLeft, TrendingUp, TrendingDown, Minus,
  RefreshCw, Plus, X, ArrowUpDown, ExternalLink,
} from 'lucide-react';

function fmt(v, d = 2) {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
}

function fmtLarge(v) {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${Number(v).toLocaleString()}`;
}

function WatchRow({ symbol, quote, onRemove, onNavigate }) {
  const pct   = quote?.changePctToday ?? null;
  const chg   = quote?.changeToday    ?? null;
  const price = quote?.price          ?? null;
  const isUp  = (pct ?? 0) >= 0;
  const color = pct == null ? 'text-muted' : isUp ? 'text-up' : 'text-down';
  const Icon  = pct == null ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-12 items-center gap-4 px-4 py-3
                    border-b border-border/40 last:border-0
                    hover:bg-cardHi transition-colors group">
      <div className="col-span-3 sm:col-span-2">
        <div className="font-mono text-sm font-bold text-bright">{symbol}</div>
        {quote?.name && (
          <div className="font-mono text-[10px] text-muted truncate max-w-[100px]">
            {quote.name}
          </div>
        )}
      </div>
      <div className="col-span-2 font-mono text-sm text-bright">
        {price != null ? `$${fmt(price)}` : '—'}
      </div>
      <div className={`col-span-2 flex items-center gap-1 ${color}`}>
        <Icon size={12} />
        <span className="font-mono text-sm font-bold">
          {chg != null ? `${isUp && chg > 0 ? '+' : ''}${fmt(chg)}` : '—'}
        </span>
      </div>
      <div className={`col-span-2 font-mono text-sm font-bold ${color}`}>
        {pct != null ? `${isUp && pct > 0 ? '+' : ''}${fmt(pct)}%` : '—'}
      </div>
      <div className="hidden sm:block sm:col-span-2 font-mono text-xs text-dim">
        {fmtLarge(quote?.marketCap)}
      </div>
      <div className="hidden sm:block sm:col-span-1 font-mono text-xs text-dim">
        {quote?.volume ? `${(quote.volume / 1e6).toFixed(1)}M` : '—'}
      </div>
      <div className="col-span-1 flex items-center gap-1 justify-end">
        <button
          onClick={() => onNavigate(symbol)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded
                     text-muted hover:text-up hover:bg-up/10 transition-all"
          title="Open in terminal"
        >
          <ExternalLink size={12} />
        </button>
        <button
          onClick={() => onRemove(symbol)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded
                     text-muted hover:text-down hover:bg-downDim transition-all"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export default function Watchlist() {
  const navigate = useNavigate();
  const {
    sorted, quotes, loading,
    add, remove, refresh,
    sortKey, setSortKey,
  } = useWatchlist();
const { prices: livePrices } = useLivePrices(sorted);

  const [input, setInput] = useState('');

  const handleAdd = () => {
    const sym = input.trim().toUpperCase();
    if (sym) { add(sym); setInput(''); }
  };

  const goToTerminal = (sym) => {
    sessionStorage.setItem('mm_load_symbol', sym);
    navigate('/');
  };

  const SORT_OPTIONS = [
    { key: 'symbol', label: 'A → Z'   },
    { key: 'pct',    label: '% Chg ↓' },
    { key: 'change', label: 'Chg ↓'   },
  ];

  const TABLE_HEADERS = [
    ['col-span-3 sm:col-span-2', 'Symbol'],
    ['col-span-2',               'Price'],
    ['col-span-2',               'Change'],
    ['col-span-2',               '% Change'],
    ['hidden sm:block sm:col-span-2', 'Mkt Cap'],
    ['hidden sm:block sm:col-span-1', 'Volume'],
    ['col-span-1',               ''],
  ];

  return (
    <div className="min-h-screen bg-void grid-bg scanlines">
      <header className="sticky top-0 z-40 bg-void/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 font-mono text-xs text-muted hover:text-up
                       border border-border hover:border-up px-3 py-1.5 rounded-lg transition-all"
          >
            <ArrowLeft size={12} /> Terminal
          </button>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-gold" />
            <span className="font-display font-bold text-bright">Watchlist</span>
          </div>
          <span className="font-mono text-xs text-muted hidden sm:block">
            {sorted.length}/20 symbols · persisted locally
          </span>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <div className="panel p-4 flex flex-wrap items-start gap-3">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add ticker (AAPL, RELIANCE.NSE…)"
              maxLength={15}
              disabled={sorted.length >= 20}
              className="flex-1 bg-ink border border-border rounded-xl px-4 py-2 font-mono
                         text-sm text-bright placeholder-muted outline-none focus:border-up
                         transition-colors disabled:opacity-40"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim() || sorted.length >= 20}
              className="flex items-center gap-1.5 bg-up/10 text-up border border-up/20
                         font-mono text-xs px-4 py-2 rounded-xl hover:bg-up/20 transition-all
                         disabled:opacity-30 active:scale-95"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ArrowUpDown size={12} className="text-muted" />
            <span className="font-mono text-xs text-muted">Sort:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={`font-mono text-xs px-3 py-1.5 rounded-lg transition-all
                  ${sortKey === opt.key
                    ? 'bg-up/20 text-up border border-up/30'
                    : 'text-muted border border-border hover:border-borderHi hover:text-text'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg
                       text-muted border border-border hover:border-up hover:text-up
                       transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="panel">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-ink/50">
            {TABLE_HEADERS.map(([cls, label]) => (
              <div key={label} className={`${cls} panel-label`}>{label}</div>
            ))}
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Star size={32} className="text-muted opacity-20" />
              <p className="font-mono text-sm text-muted">Your watchlist is empty</p>
              <p className="font-mono text-[10px] text-muted/60">
                Type a ticker above — supports US (AAPL) and Indian (.NSE) stocks
              </p>
            </div>
          ) : (
            sorted.map((sym) => (
              <WatchRow
                key={sym}
                symbol={sym}
                quote={{ ...quotes[sym], ...livePrices[sym] }}                onRemove={remove}
                onNavigate={goToTerminal}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}