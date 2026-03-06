import { useEffect, useState, useCallback } from 'react';
import { fetchIndices } from '../api/marketApi';
import { Globe, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(d);
}

function fmtPrice(price, currency) {
  if (price == null) return '—';
  const sym = currency === 'INR' ? '₹' : '$';
  return `${sym}${price >= 1000
    ? price.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : price.toFixed(2)}`;
}

function IndexCard({ index }) {
  const isUp   = (index.changePct ?? 0) >= 0;
  const isNull = index.price == null;
  const Icon   = isNull ? Minus : isUp ? TrendingUp : TrendingDown;
  const color  = isNull ? 'text-muted' : isUp ? 'text-up' : 'text-down';

  return (
    <div className="flex flex-col gap-1.5 bg-ink border border-border rounded-xl px-4 py-3
                    hover:border-borderHi transition-colors">
      {/* Name */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted truncate">{index.name}</span>
        <span className="font-mono text-[9px] text-muted/60">{index.currency}</span>
      </div>

      {/* Price */}
      <div className="font-mono text-base font-bold text-bright">
        {isNull ? (index.error ? 'Err' : '—') : fmtPrice(index.price, index.currency)}
      </div>

      {/* Change */}
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon size={11} />
        <span className="font-mono text-xs font-bold">
          {isNull ? '—' : `${isUp ? '+' : ''}${fmt(index.changePct)}%`}
        </span>
      </div>

      {/* Absolute change */}
      {!isNull && (
        <div className={`font-mono text-[10px] ${color} opacity-70`}>
          {isUp ? '+' : ''}{fmt(index.change, 2)} pts
        </div>
      )}
    </div>
  );
}

export default function IndicesPanel() {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastAt,  setLastAt]  = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchIndices();
      setIndices(d);
      setLastAt(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-muted" />
          <span className="panel-label">Global Indices</span>
          {lastAt && (
            <span className="font-mono text-[9px] text-muted">
              · {lastAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="p-1.5 rounded-lg text-muted hover:text-up hover:bg-up/10 transition-all disabled:opacity-40"
          title="Refresh indices"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !indices.length ? (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-ink border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {indices.map((idx) => (
            <IndexCard key={idx.symbol} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}