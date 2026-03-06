import { useState } from 'react';
import { useWatchlist } from '../hooks/useWatchlist';
import {
  Star, Plus, X, RefreshCw, TrendingUp, TrendingDown,
  Minus, ArrowUpDown, ChevronRight,
} from 'lucide-react';

function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(d);
}

function WatchRow({ symbol, quote, onRemove, onSelect }) {
  const pct    = quote?.changePctToday ?? null;
  const chg    = quote?.changeToday    ?? null;
  const price  = quote?.price          ?? null;
  const isUp   = (pct ?? 0) >= 0;
  const color  = pct == null ? 'text-muted' : isUp ? 'text-up' : 'text-down';
  const Icon   = pct == null ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-cardHi transition-colors
                    border-b border-border/40 last:border-0">
      {/* Symbol + click to load */}
      <button
        onClick={() => onSelect(symbol)}
        className="flex-1 flex items-center justify-between min-w-0"
      >
        <div className="text-left">
          <div className="font-mono text-sm font-bold text-bright">{symbol}</div>
          {price != null && (
            <div className="font-mono text-[10px] text-dim">${fmt(price)}</div>
          )}
        </div>

        <div className={`text-right ${color}`}>
          <div className="flex items-center gap-1 justify-end">
            <Icon size={10} />
            <span className="font-mono text-xs font-bold">
              {pct != null ? `${isUp ? '+' : ''}${fmt(pct)}%` : '—'}
            </span>
          </div>
          {chg != null && (
            <div className="font-mono text-[10px] opacity-70">
              {isUp ? '+' : ''}{fmt(chg)}
            </div>
          )}
        </div>
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(symbol)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted
                   hover:text-down hover:bg-downDim transition-all"
        title="Remove"
      >
        <X size={11} />
      </button>
    </div>
  );
}

export default function WatchlistSidebar({ onSelectSymbol }) {
  const { sorted, quotes, loading, add, remove, refresh, sortKey, setSortKey } = useWatchlist();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const sym = input.trim().toUpperCase();
    if (sym) { add(sym); setInput(''); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const SORT_OPTIONS = [
    { key: 'symbol', label: 'A–Z' },
    { key: 'pct',    label: '% Chg' },
    { key: 'change', label: 'Chg' },
  ];

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Star size={13} className="text-gold" />
          <span className="panel-label">Watchlist</span>
          <span className="font-mono text-[9px] bg-border/50 text-muted px-1.5 rounded">
            {sorted.length}/20
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-muted hover:text-up hover:bg-up/10
                     transition-all disabled:opacity-40"
          title="Refresh quotes"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Add input */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="Add ticker…"
            maxLength={12}
            className="flex-1 bg-ink border border-border rounded-lg px-3 py-1.5 font-mono
                       text-xs text-bright placeholder-muted outline-none focus:border-up
                       transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || sorted.length >= 20}
            className="p-1.5 rounded-lg bg-up/10 text-up border border-up/20
                       hover:bg-up/20 transition-all disabled:opacity-30"
            title="Add to watchlist"
          >
            <Plus size={14} />
          </button>
        </div>
        {sorted.length >= 20 && (
          <p className="font-mono text-[9px] text-down mt-1">Maximum 20 symbols reached</p>
        )}
      </div>

      {/* Sort controls */}
      {sorted.length > 1 && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <ArrowUpDown size={10} className="text-muted" />
          <span className="font-mono text-[9px] text-muted">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`font-mono text-[9px] px-2 py-0.5 rounded transition-all
                ${sortKey === opt.key
                  ? 'bg-up/20 text-up border border-up/20'
                  : 'text-muted border border-transparent hover:border-border'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
            <Star size={24} className="text-muted opacity-30" />
            <p className="font-mono text-xs text-muted">No symbols yet</p>
            <p className="font-mono text-[10px] text-muted/60">
              Type a ticker above to start tracking
            </p>
          </div>
        ) : (
          sorted.map((sym) => (
            <WatchRow
              key={sym}
              symbol={sym}
              quote={quotes[sym]}
              onRemove={remove}
              onSelect={onSelectSymbol}
            />
          ))
        )}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-2 border-t border-border">
        <p className="font-mono text-[9px] text-muted/50">
          Click a row to load in terminal · supports US &amp; Indian (.NSE)
        </p>
      </div>
    </div>
  );
}