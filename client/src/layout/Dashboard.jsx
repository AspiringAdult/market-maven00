import TickerAutocomplete from "../components/TickerAutocomplete";
import SuggestionPanel from "../components/SuggestionPanel";
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTerminal, cacheClear } from '../api/marketApi';
import { useAutoRefresh }    from '../hooks/useAutoRefresh';

import SearchBar        from '../components/SearchBar';
import PriceCard        from '../components/PriceCard';
import ChartPanel       from '../components/ChartPanel';
import IndicatorPanel   from '../components/IndicatorPanel';
import SentimentPanel   from '../components/SentimentPanel';
import FundamentalsPanel from '../components/FundamentalsPanel';
import NewsPanel        from '../components/NewsPanel';
import SignalPanel      from '../components/SignalPanel';
import MarketHeatmap    from '../components/MarketHeatmap';
import IndicesPanel     from '../components/IndicesPanel';
import WatchlistSidebar from '../components/WatchlistSidebar';
import LiveToggle       from '../components/LiveToggle';

import {
  AlertTriangle, Wifi, Server, Clock, Layers,
  TrendingUp, Activity, BarChart2, Star, GitCompare,
  Briefcase, PanelRightClose, PanelRightOpen,
} from 'lucide-react';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonBlock({ className = '' }) {
  return <div className={`bg-card border border-border rounded-xl animate-pulse ${className}`} />;
}
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-4">
        <SkeletonBlock className="col-span-12 md:col-span-4 lg:col-span-3 h-72" />
        <SkeletonBlock className="col-span-12 md:col-span-8 lg:col-span-9 h-72" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <SkeletonBlock className="col-span-12 md:col-span-4 h-80" />
        <SkeletonBlock className="col-span-12 md:col-span-4 h-80" />
        <SkeletonBlock className="col-span-12 md:col-span-4 h-80" />
      </div>
      <SkeletonBlock className="h-40" />
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────
function ErrorState({ error, symbol, onRetry }) {
  const isNotFound = error?.includes('not found') || error?.includes('404');
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-full bg-downDim border border-down/20 flex items-center justify-center">
        <AlertTriangle size={28} className="text-down" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-bright mb-2">
          {isNotFound ? `Symbol "${symbol}" not found` : 'Failed to load data'}
        </h2>
        <p className="font-mono text-sm text-muted max-w-sm">
          {isNotFound
            ? 'Check the ticker symbol. Use AAPL for US or RELIANCE.NSE for Indian stocks.'
            : error}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="font-mono text-xs bg-card border border-border hover:border-up
                   text-dim hover:text-up px-5 py-2.5 rounded-lg transition-all"
      >
        Try again
      </button>
    </div>
  );
}

// ── Welcome state ──────────────────────────────────────────────────────────────
function WelcomeState({ onSearch }) {
  const US_TIPS  = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
  const IND_TIPS = ['RELIANCE.NSE', 'TCS.NSE', 'INFY.NSE'];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-up/10 border border-up/20 flex items-center justify-center">
          <TrendingUp size={36} className="text-up" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ink border border-up/30 flex items-center justify-center">
          <Activity size={10} className="text-up" />
        </div>
      </div>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-bright mb-2">
          Market<span className="text-up">Maven</span> Terminal
        </h1>
        <p className="font-body text-dim max-w-md text-sm">
          Professional stock analysis — US equities via Stooq + Alpha Vantage,
          Indian equities via TwelveData.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">US Stocks</span>
          <div className="flex gap-2 flex-wrap justify-center">
            {US_TIPS.map((sym) => (
              <button key={sym} onClick={() => onSearch(sym)}
                className="font-mono text-sm px-4 py-1.5 bg-card border border-border
                           hover:border-up hover:text-up text-dim rounded-xl transition-all
                           hover:shadow-glow active:scale-95"
              >{sym}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Indian Stocks</span>
          <div className="flex gap-2 flex-wrap justify-center">
            {IND_TIPS.map((sym) => (
              <button key={sym} onClick={() => onSearch(sym)}
                className="font-mono text-sm px-4 py-1.5 bg-card border border-border
                           hover:border-cyan hover:text-cyan text-dim rounded-xl transition-all
                           active:scale-95"
              >{sym}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 max-w-xl w-full">
        {[
          { icon: TrendingUp,  label: 'Live Prices',  sub: 'Multi-market' },
          { icon: Activity,    label: 'AI Signals',   sub: 'RSI·MACD·BB'  },
          { icon: BarChart2,   label: 'Heatmap',      sub: '12 major tickers' },
          { icon: Star,        label: 'Watchlist',    sub: 'Up to 20 symbols' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <Icon size={18} className="text-up mx-auto mb-1.5" />
            <div className="font-mono text-xs text-bright">{label}</div>
            <div className="font-mono text-[10px] text-muted mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Meta bar ──────────────────────────────────────────────────────────────────
function MetaBar({ meta }) {
  if (!meta) return null;
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] text-muted flex-wrap">
      {meta.elapsedMs != null && (
        <div className="flex items-center gap-1"><Server size={9} /><span>{meta.elapsedMs}ms</span></div>
      )}
      {meta.candleCount != null && (
        <div className="flex items-center gap-1"><Layers size={9} /><span>{meta.candleCount} candles</span></div>
      )}
      {meta.fetchedAt && (
        <div className="flex items-center gap-1">
          <Clock size={9} /><span>{new Date(meta.fetchedAt).toLocaleTimeString()}</span>
        </div>
      )}
      {meta.provider && (
        <div className="flex items-center gap-1">
          <Wifi size={9} /><span>{meta.provider}</span>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();

  const [symbol,      setSymbol]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [data,        setData]        = useState(null);
  const [showWatch,   setShowWatch]   = useState(false);

  // ── Load symbol ────────────────────────────────────────────────────────────
  const loadSymbol = useCallback(async (sym, forceRefresh = false) => {
    if (!sym?.trim()) return;
    const upper = sym.trim().toUpperCase();
    setSymbol(upper);
    setLoading(true);
    setError(null);
    if (forceRefresh) cacheClear(`term_${upper}`);
    try {
      const result = await fetchTerminal(upper, '1y');
      setData({ ...result, symbol: upper });
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setData(null);
    } finally { setLoading(false); }
  }, []);

  // ── Auto-load symbol passed from other pages or preload default ──────────
  useEffect(() => {
    const pending = sessionStorage.getItem('mm_load_symbol');

    if (pending) {
      sessionStorage.removeItem('mm_load_symbol');
      loadSymbol(pending);
    } else {
      // preload a default ticker so the dashboard isn't empty on first visit
      loadSymbol('AAPL');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh ───────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (symbol) loadSymbol(symbol, true);
  }, [symbol, loadSymbol]);

  const [liveEnabled, toggleLive, countdown] = useAutoRefresh(handleRefresh, 30_000);

  // ── Nav items ──────────────────────────────────────────────────────────────
  const NAV = [
    { label: 'Terminal',  path: '/',          icon: BarChart2,  active: true  },
    { label: 'Compare',   path: '/compare',   icon: GitCompare, active: false },
    { label: 'Watchlist', path: '/watchlist', icon: Star,       active: false },
    { label: 'Portfolio', path: '/portfolio', icon: Briefcase,  active: false },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void grid-bg scanlines">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 bg-void/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">

          {/* Wordmark */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-up/15 border border-up/25 flex items-center justify-center">
              <TrendingUp size={14} className="text-up" />
            </div>
            <span className="font-display font-bold text-bright hidden sm:block tracking-tight">
              Market<span className="text-up">Maven</span>
            </span>
          </div>

          <div className="w-px h-5 bg-border flex-shrink-0" />

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <TickerAutocomplete onSelect={loadSymbol} />
          </div>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {NAV.map(({ label, path, icon: Icon, active }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5
                            rounded-lg transition-all
                            ${active
                              ? 'bg-up/10 text-up border border-up/20'
                              : 'text-muted hover:text-text border border-transparent hover:border-border'
                            }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </nav>

          {/* Live toggle */}
          <div className="ml-auto flex items-center gap-2">
            <LiveToggle enabled={liveEnabled} onToggle={toggleLive} countdown={countdown} />
            {/* Watchlist sidebar toggle */}
            <button
              onClick={() => setShowWatch((v) => !v)}
              className={`p-1.5 rounded-lg border transition-all hidden lg:flex items-center
                ${showWatch
                  ? 'bg-gold/10 text-gold border-gold/20'
                  : 'text-muted border-border hover:border-borderHi hover:text-dim'
                }`}
              title="Toggle watchlist panel"
            >
              {showWatch ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 flex gap-4">

        {/* ── Main column ── */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Indices bar — always visible */}
          <IndicesPanel />

          {/* Welcome */}
          {!loading && !error && !data && (
            <WelcomeState onSearch={loadSymbol} />
          )}
          {!loading && !error && !data && (
          <SuggestionPanel onSelect={loadSymbol} />
          )}
          {/* Loading */}
          {loading && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="spinner" />
                <div>
                  <div className="font-mono text-sm text-bright">Loading {symbol}…</div>
                  <div className="font-mono text-[10px] text-muted">
                    Fetching history · indicators · fundamentals · sentiment
                  </div>
                </div>
              </div>
              <LoadingSkeleton />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <ErrorState error={error} symbol={symbol} onRetry={() => loadSymbol(symbol)} />
          )}

          {/* ── Dashboard grid ── */}
          {!loading && !error && data && (
            <div className="flex flex-col gap-4">

              <MetaBar meta={data.meta} />

              {/* ROW 1: Price card + Chart */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-5 lg:col-span-3 fade-in-d1">
                  <PriceCard quote={data.quote} />
                </div>
                <div className="col-span-12 md:col-span-7 lg:col-span-9 fade-in-d2" style={{ minHeight: '360px' }}>
                  <ChartPanel history={data.history} symbol={data.symbol} quote={data.quote} />
                </div>
              </div>

              {/* ROW 2: Indicators + Signal + Sentiment */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6 lg:col-span-4 fade-in-d3">
                  <IndicatorPanel indicators={data.indicators} quote={data.quote} />
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-4 fade-in-d4">
                  <SignalPanel indicators={data.indicators} quote={data.quote} />
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-4 fade-in-d5">
                  <SentimentPanel sentiment={data.sentiment} />
                </div>
              </div>

              {/* ROW 3: Fundamentals + News */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-4 fade-in-d5">
                  <FundamentalsPanel fundamentals={data.fundamentals} />
                </div>
                <div className="col-span-12 lg:col-span-8 fade-in-d6">
                  <NewsPanel sentiment={data.sentiment} />
                </div>
              </div>

              {/* ROW 4: Heatmap */}
              <div className="fade-in-d6">
                <MarketHeatmap onSelectSymbol={loadSymbol} />
              </div>

              {/* Partial-failure banner */}
              {(data.quoteError || data.historyError || data.indicatorsError ||
                data.fundamentalsError || data.sentimentError) && (
                <div className="bg-downDim border border-down/20 rounded-xl px-4 py-3
                                flex items-start gap-2 font-mono text-xs text-down">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Partial data — some services failed: </span>
                    <span className="text-down/70">
                      {[
                        data.quoteError        && 'quote',
                        data.historyError      && 'history',
                        data.indicatorsError   && 'indicators',
                        data.fundamentalsError && 'fundamentals',
                        data.sentimentError    && 'sentiment',
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Heatmap always visible even without a loaded symbol */}
          {!loading && !error && !data && (
            <MarketHeatmap onSelectSymbol={loadSymbol} />
          )}
          </main>

        {/* ── Watchlist sidebar ── */}
        {showWatch && (
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
              <WatchlistSidebar onSelectSymbol={loadSymbol} />
            </div>
          </aside>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-4 py-4">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-[10px] text-muted">Market Maven · v2.0</span>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
            <Wifi size={9} />
            <span>Stooq · Alpha Vantage · TwelveData · NewsAPI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}