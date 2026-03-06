import { Zap } from 'lucide-react';

// ── Signal computation engine ─────────────────────────────────────────────────
function computeSignal(latest, price) {
  if (!latest) return null;

  // Each vote: { weight, direction }  direction: +1 = bullish, -1 = bearish, 0 = neutral
  const votes = [];

  // RSI (weight 2)
  if (latest.rsi != null) {
    if      (latest.rsi <= 25) votes.push({ w: 2.0, d:  1   });
    else if (latest.rsi <= 35) votes.push({ w: 1.5, d:  0.6 });
    else if (latest.rsi >= 75) votes.push({ w: 2.0, d: -1   });
    else if (latest.rsi >= 65) votes.push({ w: 1.5, d: -0.6 });
    else                        votes.push({ w: 0.5, d: latest.rsi < 50 ? 0.2 : -0.2 });
  }

  // MACD cross (weight 2) + absolute position (weight 0.5)
  if (latest.macd != null && latest.macdSignal != null) {
    const cross = latest.macd - latest.macdSignal;
    votes.push({ w: 2.0, d: cross > 0 ? 1 : cross < 0 ? -1 : 0 });
    votes.push({ w: 0.5, d: latest.macd > 0 ? 1 : -1 });
  }

  // Price vs SMA 20 (weight 1.5)
  if (price != null && latest.sma20 != null)
    votes.push({ w: 1.5, d: price > latest.sma20 ? 1 : -1 });

  // Price vs SMA 50 (weight 1.5)
  if (price != null && latest.sma50 != null)
    votes.push({ w: 1.5, d: price > latest.sma50 ? 1 : -1 });

  // Golden / death cross SMA20 vs SMA50 (weight 1)
  if (latest.sma20 != null && latest.sma50 != null)
    votes.push({ w: 1.0, d: latest.sma20 > latest.sma50 ? 1 : -1 });

  // Price vs EMA 20 (weight 1)
  if (price != null && latest.ema20 != null)
    votes.push({ w: 1.0, d: price > latest.ema20 ? 1 : -1 });

  // Bollinger Band position (weight 1.5)
  if (price != null && latest.bbUpper != null && latest.bbLower != null) {
    const range = latest.bbUpper - latest.bbLower;
    if (range > 0) {
      const pos = (price - latest.bbLower) / range; // 0=lower band, 1=upper band
      if      (pos <= 0.1) votes.push({ w: 1.5, d:  1   });
      else if (pos >= 0.9) votes.push({ w: 1.5, d: -1   });
      else                  votes.push({ w: 0.5, d: pos < 0.5 ? 0.3 : -0.3 });
    }
  }

  if (!votes.length) return null;

  const totalW = votes.reduce((s, v) => s + v.w, 0);
  const score  = votes.reduce((s, v) => s + v.w * v.d, 0) / totalW; // -1 … +1

  const action =
    score >  0.2 ? 'BUY'  :
    score < -0.2 ? 'SELL' : 'HOLD';

  // Convert score to probabilities
  const rawBuy  = Math.max(0, score);
  const rawSell = Math.max(0, -score);
  const rawHold = 1 - rawBuy - rawSell;

  const buyPct  = Math.round(rawBuy  * 100);
  const sellPct = Math.round(rawSell * 100);
  const holdPct = 100 - buyPct - sellPct;

  return { action, score, confidence: Math.abs(score), buyPct, holdPct, sellPct };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProbBar({ label, pct, color }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between font-mono text-[10px]">
        <span className="text-muted">{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function FactorRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
      <span className="font-mono text-[10px] text-muted">{label}</span>
      <span className={`font-mono text-[10px] font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SignalPanel({ indicators, quote }) {
  const sig = computeSignal(indicators?.latest, quote?.price);
  const l   = indicators?.latest ?? {};

  const actionColor =
    sig?.action === 'BUY'  ? '#10b981' :
    sig?.action === 'SELL' ? '#f43f5e' : '#f59e0b';

  const actionBg =
    sig?.action === 'BUY'  ? 'bg-upDim   border-up/30'   :
    sig?.action === 'SELL' ? 'bg-downDim border-down/30' :
                              'bg-border/20 border-border';

  const fmt2 = (v, d = 2) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(d));

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span className="panel-label">AI Signal Engine</span>
        <Zap size={13} className="text-gold" />
      </div>

      <div className="p-4 flex flex-col gap-4">
        {!sig ? (
          <div className="flex flex-col items-center py-8 gap-2 text-center">
            <Zap size={28} className="text-muted opacity-30" />
            <p className="font-mono text-xs text-muted">Load a symbol with indicators</p>
            <p className="font-mono text-[10px] text-muted/60">Signal engine requires RSI, MACD, SMA</p>
          </div>
        ) : (
          <>
            {/* ── Action badge ── */}
            <div className={`border rounded-xl p-5 text-center ${actionBg}`}>
              <div className="font-mono text-[10px] text-muted tracking-[0.2em] mb-1">
                COMPOSITE SIGNAL
              </div>
              <div
                className="font-display text-5xl font-black tracking-tight mb-1"
                style={{ color: actionColor }}
              >
                {sig.action}
              </div>
              <div className="font-mono text-xs text-dim">
                Confidence&nbsp;
                <span style={{ color: actionColor }}>{(sig.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* ── Probability bars ── */}
            <div className="flex flex-col gap-3">
              <ProbBar label="BUY Probability"  pct={sig.buyPct}  color="#10b981" />
              <ProbBar label="HOLD Probability" pct={sig.holdPct} color="#f59e0b" />
              <ProbBar label="SELL Probability" pct={sig.sellPct} color="#f43f5e" />
            </div>

            {/* ── Score bar ── */}
            <div className="bg-ink border border-border rounded-lg p-3">
              <div className="panel-label mb-2">Signal Score (−1 bearish → +1 bullish)</div>
              <div className="relative h-2 bg-border rounded-full overflow-hidden">
                <div className="absolute left-1/2 top-0 w-px h-full bg-dim" />
                <div
                  className="absolute top-0 h-full rounded-full transition-all duration-700"
                  style={{
                    background: actionColor,
                    width:      `${Math.abs(sig.score) * 50}%`,
                    left:       sig.score >= 0 ? '50%' : `${50 - Math.abs(sig.score) * 50}%`,
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] text-muted mt-1">
                <span className="text-down">SELL −1</span>
                <span style={{ color: actionColor }} className="font-bold">
                  {sig.score >= 0 ? '+' : ''}{sig.score.toFixed(3)}
                </span>
                <span className="text-up">+1 BUY</span>
              </div>
            </div>

            {/* ── Factor breakdown ── */}
            <div className="bg-ink border border-border rounded-lg p-3">
              <div className="panel-label mb-2">Factor Analysis</div>
              {[
                {
                  label: 'RSI (14)',
                  value: l.rsi != null ? `${fmt2(l.rsi, 1)}` : '—',
                  color: l.rsi <= 30 ? 'text-up' : l.rsi >= 70 ? 'text-down' : 'text-dim',
                },
                {
                  label: 'MACD Cross',
                  value: l.macd != null
                    ? (l.macd > (l.macdSignal ?? 0) ? '▲ Bullish' : '▼ Bearish')
                    : '—',
                  color: l.macd > (l.macdSignal ?? 0) ? 'text-up' : 'text-down',
                },
                {
                  label: 'vs SMA 20',
                  value: quote?.price && l.sma20
                    ? (quote.price > l.sma20 ? '▲ Above' : '▼ Below')
                    : '—',
                  color: quote?.price > l.sma20 ? 'text-up' : 'text-down',
                },
                {
                  label: 'vs SMA 50',
                  value: quote?.price && l.sma50
                    ? (quote.price > l.sma50 ? '▲ Above' : '▼ Below')
                    : '—',
                  color: quote?.price > l.sma50 ? 'text-up' : 'text-down',
                },
                {
                  label: 'SMA Cross',
                  value: l.sma20 && l.sma50
                    ? (l.sma20 > l.sma50 ? '▲ Golden' : '▼ Death')
                    : '—',
                  color: l.sma20 > l.sma50 ? 'text-up' : 'text-down',
                },
                {
                  label: 'Bollinger',
                  value: quote?.price && l.bbLower
                    ? (quote.price <= l.bbLower ? '▲ Near Lower'
                      : quote.price >= l.bbUpper ? '▼ Near Upper'
                      : '◆ Mid Range')
                    : '—',
                  color: quote?.price <= l.bbLower ? 'text-up'
                    : quote?.price >= l.bbUpper ? 'text-down' : 'text-dim',
                },
              ].map((row) => (
                <FactorRow key={row.label} {...row} />
              ))}
            </div>

            <p className="font-mono text-[9px] text-muted/50 text-center leading-relaxed">
              Educational signal only · Not financial advice.<br />
              Past signals do not predict future performance.
            </p>
          </>
        )}
      </div>
    </div>
  );
}