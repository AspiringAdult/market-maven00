import { useState, useRef, useEffect } from 'react';
import { Search, Zap, ChevronRight } from 'lucide-react';

const POPULAR = [
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'NVDA',  name: 'Nvidia' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'META',  name: 'Meta' },
  { symbol: 'JPM',   name: 'JPMorgan' },
];

export default function SearchBar({ onSearch, loading, currentSymbol }) {
  const [value, setValue]     = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef              = useRef(null);

  // Keyboard shortcut: press "/" to focus search
  useEffect(() => {
    const handle = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  const submit = () => {
    const sym = value.trim().toUpperCase();
    if (sym.length >= 1) {
      onSearch(sym);
      setValue('');
      inputRef.current?.blur();
      setFocused(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') { setValue(''); inputRef.current?.blur(); setFocused(false); }
  };

  const quickLoad = (sym) => {
    onSearch(sym);
    setValue('');
    setFocused(false);
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div
        className={`flex items-center gap-3 bg-card border rounded-xl px-4 py-2.5 transition-all duration-200
          ${focused ? 'border-up shadow-glow' : 'border-border'}`}
      >
        <Search
          size={15}
          className={`transition-colors ${focused ? 'text-up' : 'text-muted'}`}
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search ticker…"
          maxLength={10}
          className="bg-transparent outline-none font-mono text-sm text-bright placeholder-muted w-32 tracking-wider"
          spellCheck={false}
        />

        {currentSymbol && !focused && (
          <span className="font-mono text-xs text-muted border border-border rounded px-1.5 py-0.5">
            {currentSymbol}
          </span>
        )}

        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className="ml-auto flex items-center gap-1.5 bg-up/10 hover:bg-up/20 text-up border border-up/20
                     font-mono text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-30
                     disabled:cursor-not-allowed active:scale-95"
        >
          {loading ? (
            <>
              <span className="w-3 h-3 border border-up/30 border-t-up rounded-full animate-spin" />
              <span>Loading</span>
            </>
          ) : (
            <>
              <Zap size={11} />
              <span>Load</span>
            </>
          )}
        </button>

        {!focused && (
          <span className="hidden sm:block font-mono text-[10px] text-muted border border-border/50 rounded px-1">
            /
          </span>
        )}
      </div>

      {/* Quick-pick dropdown */}
      {focused && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 panel py-2 min-w-[260px]">
          <div className="px-4 py-1.5 panel-label">Popular Tickers</div>
          {POPULAR.map((item) => (
            <button
              key={item.symbol}
              onMouseDown={() => quickLoad(item.symbol)}
              className={`w-full flex items-center justify-between px-4 py-2 hover:bg-cardHi transition-colors
                ${currentSymbol === item.symbol ? 'text-up' : 'text-text'}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold w-12 text-left">{item.symbol}</span>
                <span className="text-xs text-dim">{item.name}</span>
              </div>
              <ChevronRight size={12} className="text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}