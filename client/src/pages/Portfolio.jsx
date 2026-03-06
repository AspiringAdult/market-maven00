import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../hooks/usePortfolio';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Briefcase, ArrowLeft, Plus, X, RefreshCw,
  TrendingUp, TrendingDown, Minus, DollarSign,
} from 'lucide-react';

const PALETTE = [
  '#10b981','#3b82f6','#f59e0b','#f43f5e','#8b5cf6',
  '#06b6d4','#84cc16','#ec4899','#fb923c','#a78bfa',
];

function fmt(v, d = 2)  { if (v == null || isNaN(v)) return '—'; return Number(v).toFixed(d); }
function fmtMoney(v)    {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sgn = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sgn}$${(abs/1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sgn}$${(abs/1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sgn}$${(abs/1e3).toFixed(2)}K`;
  return `${sgn}$${abs.toFixed(2)}`;
}

function StatCard({ label, value, sub, color = 'text-bright', icon: Icon }) {
  return (
    <div className="panel p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-muted" />}
        <span className="panel-label">{label}</span>
      </div>
      <div className={`font-mono text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

// Pie tooltip
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="font-bold" style={{ color: d.payload.fill }}>{d.name}</div>
      <div className="text-bright">{fmtMoney(d.payload.value)}</div>
      <div className="text-dim">{fmt(d.payload.pct)}% of portfolio</div>
    </div>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const {
    positions, enriched, loading,
    addPosition, removePosition, refresh,
    totalValue, totalCost, totalPnl, totalPnlPct, totalDailyPnl,
  } = usePortfolio();

  const [sym,   setSym]   = useState('');
  const [qty,   setQty]   = useState('');
  const [price, setPrice] = useState('');
  const [err,   setErr]   = useState('');

  const handleAdd = () => {
    if (!sym.trim())           { setErr('Symbol required'); return; }
    if (isNaN(parseFloat(qty)) || parseFloat(qty) <= 0) { setErr('Valid quantity required'); return; }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) { setErr('Valid buy price required'); return; }
    addPosition(sym, qty, price);
    setSym(''); setQty(''); setPrice(''); setErr('');
  };

  const pnlColor    = totalPnl >= 0    ? 'text-up'   : 'text-down';
  const dailyColor  = totalDailyPnl >= 0 ? 'text-up' : 'text-down';
  const PnlIcon     = totalPnl >= 0    ? TrendingUp   : TrendingDown;
  const DailyIcon   = totalDailyPnl >= 0 ? TrendingUp : TrendingDown;

  // Pie data
  const pieData = enriched
    .filter((p) => p.curValue > 0)
    .map((p, i) => ({
      name:  p.symbol,
      value: parseFloat(p.curValue.toFixed(2)),
      pct:   totalValue ? (p.curValue / totalValue) * 100 : 0,
      fill:  PALETTE[i % PALETTE.length],
    }));

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
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-up" />
            <span className="font-display font-bold text-bright">Portfolio Simulator</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg
                       text-muted border border-border hover:border-up hover:text-up
                       transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh Prices
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Summary cards ── */}
        {enriched.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Value"
              value={fmtMoney(totalValue)}
              sub={`Cost basis: ${fmtMoney(totalCost)}`}
              icon={DollarSign}
            />
            <StatCard
              label="Total P&L"
              value={fmtMoney(totalPnl)}
              sub={`${totalPnl >= 0 ? '+' : ''}${fmt(totalPnlPct)}% overall`}
              color={pnlColor}
              icon={PnlIcon}
            />
            <StatCard
              label="Today's P&L"
              value={fmtMoney(totalDailyPnl)}
              sub="Based on daily % change"
              color={dailyColor}
              icon={DailyIcon}
            />
            <StatCard
              label="Positions"
              value={positions.length}
              sub={`${new Set(positions.map((p) => p.symbol)).size} unique symbols`}
              icon={Briefcase}
            />
          </div>
        )}

        {/* ── Add position form ── */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="panel-label">Add Position</div>
          <div className="flex flex-wrap gap-3">
            <input
              value={sym}
              onChange={(e) => setSym(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ticker (e.g. AAPL)"
              maxLength={15}
              className="flex-1 min-w-[120px] bg-ink border border-border rounded-xl px-4 py-2
                         font-mono text-sm text-bright placeholder-muted outline-none
                         focus:border-up transition-colors"
            />
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Quantity"
              min="0.001"
              step="any"
              className="w-32 bg-ink border border-border rounded-xl px-4 py-2
                         font-mono text-sm text-bright placeholder-muted outline-none
                         focus:border-up transition-colors"
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Buy price ($)"
              min="0.01"
              step="any"
              className="w-36 bg-ink border border-border rounded-xl px-4 py-2
                         font-mono text-sm text-bright placeholder-muted outline-none
                         focus:border-up transition-colors"
            />
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 bg-up/10 text-up border border-up/20
                         font-mono text-sm px-5 py-2 rounded-xl hover:bg-up/20 transition-all
                         active:scale-95"
            >
              <Plus size={14} /> Add Position
            </button>
          </div>
          {err && <p className="font-mono text-xs text-down">{err}</p>}
        </div>

        {/* ── Main content grid ── */}
        {enriched.length > 0 ? (
          <div className="grid grid-cols-12 gap-6">

            {/* Positions table */}
            <div className="col-span-12 lg:col-span-8 panel">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border bg-ink/50">
                {[
                  ['col-span-2', 'Symbol'],
                  ['col-span-1', 'Qty'],
                  ['col-span-2', 'Buy Price'],
                  ['col-span-2', 'Cur Price'],
                  ['col-span-2', 'Cur Value'],
                  ['col-span-2', 'P&L'],
                  ['col-span-1', ''],
                ].map(([cls, lbl]) => (
                  <div key={lbl} className={`${cls} panel-label`}>{lbl}</div>
                ))}
              </div>

              {enriched.map((p, i) => {
                const pnlColor  = p.pnl >= 0 ? 'text-up' : 'text-down';
                const bgAccent  = i % 2 === 0 ? '' : 'bg-ink/30';
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/40
                                last:border-0 hover:bg-cardHi transition-colors group ${bgAccent}`}
                  >
                    <div className="col-span-2">
                      <div className="font-mono text-sm font-bold text-bright">{p.symbol}</div>
                    </div>
                    <div className="col-span-1 font-mono text-sm text-dim">{fmt(p.qty, 3)}</div>
                    <div className="col-span-2 font-mono text-sm text-dim">${fmt(p.buyPrice)}</div>
                    <div className="col-span-2 font-mono text-sm text-bright">${fmt(p.curPrice)}</div>
                    <div className="col-span-2 font-mono text-sm text-bright">{fmtMoney(p.curValue)}</div>
                    <div className={`col-span-2 font-mono text-sm font-bold ${pnlColor}`}>
                      <div>{p.pnl >= 0 ? '+' : ''}{fmtMoney(p.pnl)}</div>
                      <div className="text-[10px] opacity-80">
                        {p.pnlPct >= 0 ? '+' : ''}{fmt(p.pnlPct)}%
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => removePosition(p.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded
                                   text-muted hover:text-down hover:bg-downDim transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Allocation pie chart */}
            <div className="col-span-12 lg:col-span-4 panel flex flex-col">
              <div className="panel-header">
                <span className="panel-label">Allocation</span>
              </div>
              <div className="p-4 flex-1 flex flex-col items-center gap-4">
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="w-full flex flex-col gap-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.fill }} />
                        <span className="font-mono text-xs text-text">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs text-bright">{fmt(item.pct)}%</span>
                        <div className="font-mono text-[10px] text-dim">{fmtMoney(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Centre label overlay — shown via CSS trick */}
                <div className="text-center -mt-4">
                  <div className="font-mono text-[10px] text-muted">Portfolio</div>
                  <div className="font-mono text-lg font-bold text-bright">{fmtMoney(totalValue)}</div>
                  <div className={`font-mono text-xs ${pnlColor}`}>
                    {totalPnl >= 0 ? '+' : ''}{fmt(totalPnlPct)}% total
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel flex flex-col items-center justify-center py-24 gap-3">
            <Briefcase size={36} className="text-muted opacity-30" />
            <p className="font-mono text-sm text-muted">No positions yet</p>
            <p className="font-mono text-[10px] text-muted/60">
              Add a position above — prices refresh automatically
            </p>
          </div>
        )}
      </main>
    </div>
  );
}