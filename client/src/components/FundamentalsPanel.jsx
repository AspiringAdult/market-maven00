import { BarChart2 } from 'lucide-react';

function fmt(v, d = 2) {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
}

function fmtMoney(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${Number(v).toLocaleString()}`;
}

function fmtPct(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  // some APIs return 0.15 (15%) others return 15
  const pct = Math.abs(n) < 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

/* Individual metric card with coloured bar fill */
function MetricCard({ label, value, subValue, barPct, barColor = 'bg-up', accent = false }) {
  return (
    <div className={`bg-ink border rounded-lg p-3 transition-colors hover:border-borderHi
      ${accent ? 'border-up/30' : 'border-border'}`}
    >
      <div className="panel-label mb-1">{label}</div>
      <div className={`font-mono text-lg font-bold ${accent ? 'text-up' : 'text-bright'}`}>
        {value}
      </div>
      {subValue && <div className="font-mono text-[10px] text-dim mt-0.5">{subValue}</div>}
      {barPct != null && (
        <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, transition: 'width 0.8s ease' }}
          />
        </div>
      )}
    </div>
  );
}

/* Row in the details table */
function Row({ label, value, color = 'text-text' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-dim text-xs">{label}</span>
      <span className={`font-mono text-xs font-medium ${color}`}>{value}</span>
    </div>
  );
}

export default function FundamentalsPanel({ fundamentals }) {
  if (!fundamentals) {
    return (
      <div className="panel flex items-center justify-center p-8">
        <div className="text-center text-muted">
          <BarChart2 size={28} className="mx-auto mb-2 opacity-30" />
          <p className="font-mono text-xs">No fundamentals data</p>
        </div>
      </div>
    );
  }

  const f = fundamentals;

  // Bar fill based on metrics normalised to typical ranges
  const roeBar  = f.returnOnEquity  != null ? Math.min(100, Math.abs(f.returnOnEquity  * 100) * 2) : null;
  const roaBar  = f.returnOnAssets  != null ? Math.min(100, Math.abs(f.returnOnAssets  * 100) * 4) : null;
  const grossBar= f.grossMargins    != null ? Math.min(100, Math.abs(f.grossMargins    * 100))     : null;

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span className="panel-label">Fundamentals</span>
        {f.sector && <span className="font-mono text-[10px] text-muted">{f.sector}</span>}
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-y-auto">

        {/* Hero metrics */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="P/E Ratio"
            value={fmt(f.peRatio)}
            subValue={f.forwardPE ? `Fwd: ${fmt(f.forwardPE)}` : null}
            accent={f.peRatio && f.peRatio < 20}
          />
          <MetricCard
            label="Market Cap"
            value={fmtMoney(f.marketCap)}
          />
          <MetricCard
            label="EPS (TTM)"
            value={f.eps ? `$${fmt(f.eps)}` : '—'}
            subValue={f.forwardEps ? `Fwd: $${fmt(f.forwardEps)}` : null}
            accent={(f.eps ?? 0) > 0}
          />
          <MetricCard
            label="Div. Yield"
            value={`${fmt(f.dividendYield, 2)}%`}
            subValue={f.dividendRate ? `$${fmt(f.dividendRate, 2)}/yr` : null}
            accent={(f.dividendYield ?? 0) > 0}
          />
        </div>

        {/* Profitability */}
        <div className="bg-ink border border-border rounded-lg p-3">
          <div className="panel-label mb-2">Profitability</div>
          <div className="flex flex-col gap-2">
            <MetricCard
              label="Return on Equity"
              value={fmtPct(f.returnOnEquity)}
              barPct={roeBar}
              barColor={(f.returnOnEquity ?? 0) > 0 ? 'bg-up' : 'bg-down'}
            />
            <MetricCard
              label="Return on Assets"
              value={fmtPct(f.returnOnAssets)}
              barPct={roaBar}
              barColor={(f.returnOnAssets ?? 0) > 0 ? 'bg-blue' : 'bg-down'}
            />
            <MetricCard
              label="Gross Margins"
              value={fmtPct(f.grossMargins)}
              barPct={grossBar}
              barColor="bg-violet"
            />
          </div>
        </div>

        {/* Detail table */}
        <div className="bg-ink border border-border rounded-lg px-3 py-1">
          <Row label="Price / Book"    value={fmt(f.priceToBook)} />
          <Row label="Debt / Equity"   value={fmt(f.debtToEquity)} color={(f.debtToEquity ?? 0) > 2 ? 'text-down' : 'text-text'} />
          <Row label="Beta"            value={fmt(f.beta, 3)} />
          <Row label="Current Ratio"   value={fmt(f.currentRatio)} color={(f.currentRatio ?? 0) >= 1.5 ? 'text-up' : 'text-down'} />
          <Row label="Total Revenue"   value={fmtMoney(f.totalRevenue)} />
          <Row label="Free Cash Flow"  value={fmtMoney(f.freeCashflow)} color={(f.freeCashflow ?? 0) > 0 ? 'text-up' : 'text-down'} />
          {f.targetMeanPrice && (
            <Row label="Analyst Target" value={`$${fmt(f.targetMeanPrice)}`} color="text-cyan" />
          )}
          {f.industry && <Row label="Industry" value={f.industry} />}
        </div>
      </div>
    </div>
  );
}