import { MessageCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function SentimentMeter({ score }) {
  // score: -1 to +1 (normalised). Map to 0–180° semicircle.
  const clamped   = Math.max(-1, Math.min(1, score ?? 0));
  const normalised= (clamped + 1) / 2;      // 0 (bearish) → 1 (bullish)
  const pct       = normalised * 100;

  const color =
    clamped > 0.15  ? '#10b981' :
    clamped < -0.15 ? '#f43f5e' :
    '#f59e0b';

  const label =
    clamped > 0.15  ? 'Bullish' :
    clamped < -0.15 ? 'Bearish' :
    'Neutral';

  const arcData = [
    { value: pct,       fill: color },
    { value: 100 - pct, fill: '#1f2f45' },
  ];

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative w-36 h-20 overflow-hidden">
        <PieChart width={144} height={144} style={{ marginTop: -68 }}>
          <Pie
            data={arcData}
            cx={72}
            cy={108}
            startAngle={180}
            endAngle={0}
            innerRadius={44}
            outerRadius={64}
            dataKey="value"
            strokeWidth={0}
          >
            {arcData.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
        </PieChart>

        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 origin-bottom w-0.5 h-10 rounded-full"
          style={{
            background: color,
            transform: `translateX(-50%) rotate(${normalised * 180 - 90}deg)`,
            boxShadow: `0 0 8px ${color}`,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {/* Center hub */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full -mb-1.5"
          style={{ background: color }}
        />
      </div>

      {/* Score + label */}
      <div className="mt-2 text-center">
        <div className="font-mono text-2xl font-bold" style={{ color }}>
          {clamped > 0 ? '+' : ''}{(clamped * 100).toFixed(0)}
        </div>
        <div className="font-mono text-xs mt-0.5" style={{ color }}>{label}</div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between w-36 mt-2 font-mono text-[9px] text-muted">
        <span className="text-down">Bearish</span>
        <span>Neutral</span>
        <span className="text-up">Bullish</span>
      </div>
    </div>
  );
}

export default function SentimentPanel({ sentiment }) {
  if (!sentiment) {
    return (
      <div className="panel flex items-center justify-center p-8">
        <div className="text-center text-muted">
          <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
          <p className="font-mono text-xs">No sentiment data</p>
        </div>
      </div>
    );
  }

  const { aggregate, articles = [] } = sentiment;
  const score = aggregate?.avgPolarity ?? 0;

  const Icon =
    aggregate?.overallSentiment === 'positive' ? TrendingUp  :
    aggregate?.overallSentiment === 'negative' ? TrendingDown :
    Minus;

  const sentColor =
    aggregate?.overallSentiment === 'positive' ? 'text-up' :
    aggregate?.overallSentiment === 'negative' ? 'text-down' :
    'text-gold';

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <span className="panel-label">News Sentiment</span>
        <Icon size={13} className={sentColor} />
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Gauge */}
        <div className="bg-ink border border-border rounded-lg py-4 flex flex-col items-center">
          <SentimentMeter score={score} />
        </div>

        {/* Aggregate stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Positive', val: aggregate?.positive ?? 0, color: 'text-up' },
            { label: 'Neutral',  val: aggregate?.neutral  ?? 0, color: 'text-gold' },
            { label: 'Negative', val: aggregate?.negative ?? 0, color: 'text-down' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-ink border border-border rounded-lg p-2">
              <div className={`font-mono text-xl font-bold ${color}`}>{val}</div>
              <div className="panel-label mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Article sentiment bar */}
        {aggregate?.total > 0 && (
          <div>
            <div className="flex rounded-full overflow-hidden h-1.5">
              <div
                className="bg-up transition-all"
                style={{ width: `${((aggregate.positive ?? 0) / aggregate.total) * 100}%` }}
              />
              <div
                className="bg-gold transition-all"
                style={{ width: `${((aggregate.neutral ?? 0) / aggregate.total) * 100}%` }}
              />
              <div
                className="bg-down transition-all"
                style={{ width: `${((aggregate.negative ?? 0) / aggregate.total) * 100}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-muted text-center mt-1">
              {aggregate.total} articles analysed
            </div>
          </div>
        )}

        {/* Top 3 article previews */}
        {articles.slice(0, 3).map((a, i) => {
          const sc =
            a.sentiment === 'positive' ? 'badge-up' :
            a.sentiment === 'negative' ? 'badge-down' :
            'badge-neutral';
          return (
            <div key={i} className="bg-ink border border-border rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={sc}>{a.sentiment}</span>
                <span className="font-mono text-[10px] text-muted">{a.source}</span>
              </div>
              <p className="text-text leading-snug line-clamp-2">{a.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}