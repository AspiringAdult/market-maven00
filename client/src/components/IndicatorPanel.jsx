import { Activity } from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

function fmt(v, d = 2) {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
}

/* RSI gauge using a semicircle Pie */
function RSIGauge({ value }) {
  if (value == null) return <div className="text-muted font-mono text-xs">No data</div>;

  const clamped = Math.max(0, Math.min(100, value));
  const isOB    = clamped >= 70;
  const isOS    = clamped <= 30;
  const color   = isOB ? '#f43f5e' : isOS ? '#10b981' : '#f59e0b';
  const label   = isOB ? 'Overbought' : isOS ? 'Oversold' : 'Neutral';

  // Semicircle: 180° arc. Map 0–100 RSI to 0–180°.
  const angle     = (clamped / 100) * 180;
  const arcData   = [
    { value: clamped,       fill: color },
    { value: 100 - clamped, fill: '#1f2f45' },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-16 overflow-hidden">
        <PieChart width={112} height={112} style={{ marginTop: -56 }}>
          <Pie
            data={arcData}
            cx={56}
            cy={84}
            startAngle={180}
            endAngle={0}
            innerRadius={36}
            outerRadius={52}
            dataKey="value"
            strokeWidth={0}
          >
            {arcData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
        {/* Center label */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className="font-mono text-xl font-bold" style={{ color }}>
            {fmt(value, 1)}
          </div>
        </div>
      </div>
      <span className="font-mono text-[10px] mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

/* Single indicator stat card */
function IndStat({ label, value, badge, sub, color = 'text-text' }) {
  return (
    <div className="bg-ink border border-border rounded-lg p-3">
      <div className="panel-label mb-1.5">{label}</div>
      <div className={`font-mono text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-dim mt-0.5">{sub}</div>}
      {badge && <div className="mt-1.5">{badge}</div>}
    </div>
  );
}

function Signal({ type }) {
  if (!type) return null;
  const map = {
    buy:     { cls: 'badge-up',      txt: '▲ BUY' },
    sell:    { cls: 'badge-down',    txt: '▼ SELL' },
    neutral: { cls: 'badge-neutral', txt: '◆ HOLD' },
  };
  const s = map[type] || map.neutral;
  return <span className={s.cls}>{s.txt}</span>;
}

/* Derive simple signal from indicator values */
function macdSignal(macd, signal) {
  if (macd == null || signal == null) return 'neutral';
  return macd > signal ? 'buy' : macd < signal ? 'sell' : 'neutral';
}

function maSignal(price, ma) {
  if (price == null || ma == null) return 'neutral';
  return price > ma ? 'buy' : price < ma ? 'sell' : 'neutral';
}

export default function IndicatorPanel({ indicators, quote }) {
  if (!indicators?.latest) {
    return (
      <div className="panel flex items-center justify-center p-8">
        <div className="text-center text-muted">
          <Activity size={28} className="mx-auto mb-2 opacity-30" />
          <p className="font-mono text-xs">No indicators</p>
        </div>
      </div>
    );
  }

  const l     = indicators.latest;
  const price = quote?.price;

  const rsiSignal  = l.rsi >= 70 ? 'sell' : l.rsi <= 30 ? 'buy' : 'neutral';
  const macdSig    = macdSignal(l.macd, l.macdSignal);
  const sma20Sig   = maSignal(price, l.sma20);
  const sma50Sig   = maSignal(price, l.sma50);

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span className="panel-label">Technical Indicators</span>
        <Activity size={13} className="text-muted" />
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* RSI Gauge */}
        <div className="bg-ink border border-border rounded-lg p-4">
          <div className="panel-label mb-3">RSI (14)</div>
          <div className="flex items-center justify-between">
            <RSIGauge value={l.rsi} />
            <div className="text-right">
              <div className="font-mono text-xs text-dim mb-1">Thresholds</div>
              <div className="font-mono text-[10px] text-down">≥ 70 Overbought</div>
              <div className="font-mono text-[10px] text-dim">30–70 Neutral</div>
              <div className="font-mono text-[10px] text-up">≤ 30 Oversold</div>
            </div>
          </div>
        </div>

        {/* MACD */}
        <IndStat
          label="MACD (12, 26, 9)"
          value={fmt(l.macd, 4)}
          sub={`Signal: ${fmt(l.macdSignal, 4)}  ·  Hist: ${fmt(l.macdHist, 4)}`}
          color={l.macd > 0 ? 'text-up' : 'text-down'}
          badge={<Signal type={macdSig} />}
        />

        {/* Moving averages grid */}
        <div className="grid grid-cols-2 gap-2">
          <IndStat
            label="SMA 20"
            value={`$${fmt(l.sma20, 2)}`}
            badge={<Signal type={sma20Sig} />}
          />
          <IndStat
            label="SMA 50"
            value={`$${fmt(l.sma50, 2)}`}
            badge={<Signal type={sma50Sig} />}
          />
          <IndStat
            label="EMA 20"
            value={`$${fmt(l.ema20, 2)}`}
          />
          <IndStat
            label="Hist. Volatility"
            value={`${fmt(l.hvAnnualised, 1)}%`}
            color={l.hvAnnualised > 40 ? 'text-down' : l.hvAnnualised > 20 ? 'text-gold' : 'text-up'}
          />
        </div>

        {/* Bollinger Bands */}
        <div className="bg-ink border border-border rounded-lg p-3">
          <div className="panel-label mb-2">Bollinger Bands (20, 2σ)</div>
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="text-center">
              <div className="text-down font-bold">${fmt(l.bbUpper, 2)}</div>
              <div className="text-muted text-[10px] mt-0.5">Upper</div>
            </div>
            <div className="text-center">
              <div className="text-dim font-bold">${fmt(l.bbMiddle, 2)}</div>
              <div className="text-muted text-[10px] mt-0.5">Middle</div>
            </div>
            <div className="text-center">
              <div className="text-up font-bold">${fmt(l.bbLower, 2)}</div>
              <div className="text-muted text-[10px] mt-0.5">Lower</div>
            </div>
          </div>
          {price && l.bbUpper && l.bbLower && (
            <div className="mt-2">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-up via-gold to-down"
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      ((price - l.bbLower) / (l.bbUpper - l.bbLower)) * 100
                    ))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5 font-mono text-[9px] text-muted">
                <span>Lower</span>
                <span className="text-bright">Price: ${fmt(price)}</span>
                <span>Upper</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}