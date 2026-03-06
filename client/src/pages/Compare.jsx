import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHistory, fetchQuote } from '../api/marketApi';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  GitCompare, Plus, X, TrendingUp, TrendingDown,
  BarChart2, Minus, ArrowLeft,
} from 'lucide-react';

const MAX_STOCKS = 4;
const PALETTE    = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e'];

const RANGE_OPTIONS = [
  { label: '1M', value: '1mo'  },
  { label: '3M', value: '3mo'  },
  { label: '6M', value: '6mo'  },
  { label: '1Y', value: '1y'   },
  { label: '2Y', value: '2y'   },
];

function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(d);
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip min-w-[160px]">
      <div className="text-muted text-[10px] mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
          <span style={{ color: p.color }} className="font-bold">{p.dataKey}</span>
          <span className="text-bright">{Number(p.value).toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="bg-ink border border-border rounded-lg p-3 text-center">
      <div className="panel-label mb-1">{label}</div>
      <div className={`font-mono text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Compare() {
  const navigate    = useNavigate();
  const [input,     setInput]     = useState('');
  const [stocks,    setStocks]    = useState([]);   // [{ symbol, quote, history, color, loading, error }]
  const [range,     setRange]     = useState('1y');
  const [globalErr, setGlobalErr] = useState('');

  // ── Add stock ──────────────────────────────────────────────────────────────
  const addStock = useCallback(async (sym) => {
    const upper = sym.trim().toUpperCase();
    if (!upper) return;
    if (stocks.length >= MAX_STOCKS) { setGlobalErr('Maximum 4 stocks'); return; }
    if (stocks.find((s) => s.symbol === upper)) { setGlobalErr(`${upper} already added`); return; }
    setGlobalErr('');

    const color = PALETTE[stocks.length];
    const entry = { symbol: upper, quote: null, history: null, color, loading: true, error: null };
    setStocks((prev) => [...prev, entry]);
    setInput('');

    try {
      const [quote, history] = await Promise.all([
        fetchQuote(upper),
        fetchHistory(upper, range),
      ]);
      setStocks((prev) =>
        prev.map((s) => s.symbol === upper ? { ...s, quote, history, loading: false } : s)
      );
    } catch (err) {
      setStocks((prev) =>
        prev.map((s) => s.symbol === upper ? { ...s, loading: false, error: err.message } : s)
      );
    }
  }, [stocks, range]);

  const removeStock = useCallback((sym) => {
    setStocks((prev) => {
      const filtered = prev.filter((s) => s.symbol !== sym);
      // Re-assign palette colours
      return filtered.map((s, i) => ({ ...s, color: PALETTE[i] }));
    });
    setGlobalErr('');
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter') addStock(input);
  };

  // ── Rebuild range for all loaded stocks ───────────────────────────────────
  const changeRange = useCallback(async (newRange) => {
    setRange(newRange);
    const loaded = stocks.filter((s) => !s.loading && !s.error);
    if (!loaded.length) return;
    setStocks((prev) => prev.map((s) => ({ ...s, loading: !s.error })));
    await Promise.all(
      loaded.map(async (s) => {
        try {
          const history = await fetchHistory(s.symbol, newRange);
          setStocks((prev) =>
            prev.map((p) => p.symbol === s.symbol ? { ...p, history, loading: false } : p)
          );
        } catch (err) {
          setStocks((prev) =>
            prev.map((p) => p.symbol === s.symbol ? { ...p, loading: false, error: err.message } : p)
          );
        }
      })
    );
  }, [stocks]);

  // ── Normalised chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const loaded = stocks.filter((s) => s.history?.length);
    if (!loaded.length) return [];

    // Find the shortest history to align dates
    const minLen = Math.min(...loaded.map((s) => s.history.length));
    const result = [];

    for (let i = 0; i < minLen; i++) {
      const row = { date: loaded[0].history[i].date };
      loaded.forEach((s) => {
        const base  = s.history[0].close;
        const close = s.history[i].close;
        row[s.symbol] = base ? parseFloat((((close - base) / base) * 100).toFixed(3)) : 0;
      });
      result.push(row);
    }
    return result;
  }, [stocks]);

  // ── Tick labels ───────────────────────────────────────────────────────────
  const tickEvery = Math.max(1, Math.floor((chartData.length || 1) / 6));
  const xTicks = chartData.filter((_, i) => i % tickEvery === 0).map((d) => d.date);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summaries = useMemo(() =>
    stocks.filter((s) => s.history?.length && s.quote).map((s) => {
      const first = s.history[0].close;
      const last  = s.history[s.history.length - 1].close;
      const pct   = first ? ((last - first) / first) * 100 : 0;
      return { ...s, pct };
    }).sort((a, b) => b.pct - a.pct),
  [stocks]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void grid-bg scanlines">

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-void/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 font-mono text-xs text-muted hover:text-up
                       border border-border hover:border-up px-3 py-1.5 rounded-lg transition-all"
          >
            <ArrowLeft size={12} /> Terminal
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GitCompare size={16} className="text-up" />
            <span className="font-display font-bold text-bright">Compare</span>
          </div>
          <span className="font-mono text-xs text-muted hidden sm:block">
            Normalised performance comparison · up to {MAX_STOCKS} stocks
          </span>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Controls row ── */}
        <div className="panel p-4 flex flex-wrap items-start gap-4">

          {/* Input */}
          <div className="flex gap-2 flex-1 min-w-[220px]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={handleKey}
              placeholder="Enter ticker (e.g. AAPL, RELIANCE.NSE)…"
              maxLength={15}
              disabled={stocks.length >= MAX_STOCKS}
              className="flex-1 bg-ink border border-border rounded-xl px-4 py-2 font-mono text-sm
                         text-bright placeholder-muted outline-none focus:border-up transition-colors
                         disabled:opacity-40"
            />
            <button
              onClick={() => addStock(input)}
              disabled={stocks.length >= MAX_STOCKS || !input.trim()}
              className="flex items-center gap-1.5 bg-up/10 text-up border border-up/20
                         font-mono text-xs px-4 py-2 rounded-xl hover:bg-up/20 transition-all
                         disabled:opacity-30 active:scale-95"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => changeRange(r.value)}
                className={`font-mono text-xs px-3 py-1.5 rounded-lg transition-all
                  ${range === r.value
                    ? 'bg-up/20 text-up border border-up/30'
                    : 'text-muted border border-border hover:border-borderHi hover:text-text'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {globalErr && (
          <div className="bg-downDim border border-down/20 rounded-xl px-4 py-2 font-mono text-xs text-down">
            {globalErr}
          </div>
        )}

        {/* ── Added stocks chips ── */}
        {stocks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stocks.map((s) => (
              <div
                key={s.symbol}
                className="flex items-center gap-2 border rounded-full px-3 py-1.5 font-mono text-xs"
                style={{ borderColor: s.color, color: s.color, background: `${s.color}15` }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="font-bold">{s.symbol}</span>
                {s.loading && (
                  <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                )}
                {s.error && <span className="text-down text-[10px]">ERR</span>}
                <button
                  onClick={() => removeStock(s.symbol)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Summary stats row ── */}
        {summaries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaries.map((s, rank) => {
              const pctColor = s.pct >= 0 ? 'text-up' : 'text-down';
              const Icon     = s.pct >= 0 ? TrendingUp : TrendingDown;
              return (
                <div key={s.symbol} className="panel p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                      <span className="font-mono text-sm font-bold text-bright">{s.symbol}</span>
                    </div>
                    <span className="font-mono text-[9px] text-muted">#{rank + 1}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pctColor}`}>
                    <Icon size={14} />
                    <span className="font-mono text-xl font-black">
                      {s.pct >= 0 ? '+' : ''}{fmt(s.pct)}%
                    </span>
                  </div>
                  <div className="font-mono text-xs text-muted">{range} return</div>
                  <div className="grid grid-cols-2 gap-1">
                    <StatCard label="Price"   value={`$${fmt(s.quote?.price)}`} color="text-bright" />
                    <StatCard label="Today"   value={`${(s.quote?.changePctToday ?? 0) >= 0 ? '+' : ''}${fmt(s.quote?.changePctToday)}%`}
                      color={(s.quote?.changePctToday ?? 0) >= 0 ? 'text-up' : 'text-down'} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Overlay chart ── */}
        {chartData.length > 0 ? (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-label">Normalised Performance (base 0%)</span>
              <span className="font-mono text-[10px] text-muted">{range.toUpperCase()} window</span>
            </div>
            <div className="p-4" style={{ height: '420px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,47,69,0.5)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    ticks={xTicks}
                    tick={{ fill: '#4a6080', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fill: '#4a6080', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                    width={56}
                  />
                  <Tooltip content={<CompareTooltip />} />
                  <Legend
                    formatter={(val) => (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#c8d8ea' }}>
                        {val}
                      </span>
                    )}
                  />
                  <ReferenceLine y={0} stroke="#4a6080" strokeDasharray="4 4" />
                  {stocks.filter((s) => s.history?.length).map((s) => (
                    <Line
                      key={s.symbol}
                      type="monotone"
                      dataKey={s.symbol}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: s.color, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="panel flex flex-col items-center justify-center py-24 gap-3">
            <BarChart2 size={36} className="text-muted opacity-30" />
            <p className="font-mono text-sm text-muted">Add up to 4 stocks to compare performance</p>
            <p className="font-mono text-[10px] text-muted/60">
              Supports US equities (AAPL) and Indian stocks (RELIANCE.NSE)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}