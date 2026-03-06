import { useLivePrices } from "../hooks/useLivePrices";
import { TrendingUp, TrendingDown, Minus, Clock, Globe } from "lucide-react";

function fmt(v, d = 2) {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toFixed(d);
}

function fmtLarge(v) {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export default function PriceCard({ quote }) {
  if (!quote) return null;

  /* ── Live price integration ───────────────────────── */

  const symbol = quote?.symbol;
  const { prices } = useLivePrices(symbol ? [symbol] : []);

  const live = symbol ? prices[symbol] : null;

  const price = live?.price ?? quote?.price;
  const change = live?.change ?? quote?.changeToday;
  const pct = live?.pct ?? quote?.changePctToday;

  /* ─────────────────────────────────────────────────── */

  const isUp = (pct ?? 0) >= 0;
  const isFlat = pct === 0 || pct == null;

  const TrendIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const priceColor = isFlat ? "text-dim" : isUp ? "text-up" : "text-down";
  const bgGlow = isFlat ? "" : isUp ? "shadow-glow" : "shadow-red";

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={`panel p-5 flex flex-col gap-4 fade-in ${bgGlow}`}>

      {/* Symbol row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-3xl font-bold text-bright tracking-tight">
              {quote.symbol}
            </span>
            <span
              className={`w-2 h-2 rounded-full ticker-dot ${
                isUp ? "bg-up" : "bg-down"
              }`}
            />
          </div>

          {quote.name && (
            <div className="font-body text-sm text-dim truncate max-w-[200px]">
              {quote.name}
            </div>
          )}
        </div>

        <div className="text-right">
          {quote.exchange && (
            <div className="flex items-center gap-1 text-muted justify-end mb-1">
              <Globe size={10} />
              <span className="font-mono text-[10px]">{quote.exchange}</span>
            </div>
          )}

          <div className="font-mono text-[10px] text-muted">
            {quote.currency || "USD"}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-3">
        <div className={`font-mono text-4xl font-bold ${priceColor} num-update`}>
          ${fmt(price, 2)}
        </div>

        <div className={`flex items-center gap-1 pb-1 ${priceColor}`}>
          <TrendIcon size={16} />

          <span className="font-mono text-base font-bold">
            {isUp && !isFlat ? "+" : ""}
            {fmt(change, 2)}
          </span>

          <span className="font-mono text-sm">
            ({isUp && !isFlat ? "+" : ""}
            {fmt(pct, 2)}%)
          </span>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
        {[
          ["Open", `$${fmt(quote.open)}`],
          ["Prev Close", `$${fmt(quote.previousClose)}`],
          ["Day High", `$${fmt(quote.dayHigh)}`],
          ["Day Low", `$${fmt(quote.dayLow)}`],
          ["52W High", quote.week52High ? `$${fmt(quote.week52High)}` : "—"],
          ["52W Low", quote.week52Low ? `$${fmt(quote.week52Low)}` : "—"],
          [
            "Volume",
            quote.volume ? (quote.volume / 1e6).toFixed(2) + "M" : "—",
          ],
          ["Mkt Cap", fmtLarge(quote.marketCap)],
        ].map(([label, val]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="panel-label">{label}</span>
            <span className="font-mono text-xs text-text">{val}</span>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1.5 text-muted">
        <Clock size={10} />
        <span className="font-mono text-[10px]">Updated {now}</span>
      </div>
    </div>
  );
}