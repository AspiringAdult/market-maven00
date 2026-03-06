/**
 * useWatchlist.jsx
 * ─────────────────
 * Hook-only file. No UI code here.
 *
 * Returns:
 *   { sorted, quotes, loading, add, remove, refresh, sortKey, setSortKey }
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchMultiQuote } from '../api/marketApi';

const LS_KEY  = 'mm_watchlist_v2';
const MAX_SYM = 20;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [symbols,  setSymbols]  = useState(loadFromStorage);
  const [quotes,   setQuotes]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [sortKey,  setSortKey]  = useState('symbol'); // 'symbol' | 'pct' | 'change'

  // ── Persist to localStorage on every symbols change ───────────────────────
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(symbols));
  }, [symbols]);

  // ── add ───────────────────────────────────────────────────────────────────
  const add = useCallback((sym) => {
    const upper = sym.trim().toUpperCase();
    if (!upper) return;
    setSymbols((prev) => {
      if (prev.includes(upper) || prev.length >= MAX_SYM) return prev;
      return [...prev, upper];
    });
  }, []);

  // ── remove ────────────────────────────────────────────────────────────────
  const remove = useCallback((sym) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
    setQuotes((prev) => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  }, []);

  // ── refresh — fetch live quotes for all tracked symbols ───────────────────
  const refresh = useCallback(async () => {
    if (!symbols.length) return;
    setLoading(true);
    try {
      const results = await fetchMultiQuote(symbols);
      const map = {};
      results.forEach((q) => {
        if (q?.symbol) map[q.symbol] = q;
      });
      setQuotes(map);
    } catch {
      // silently swallow — partial failures already handled in fetchMultiQuote
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  // ── Auto-refresh on mount + when list size changes ────────────────────────
  useEffect(() => {
    refresh();
  }, [symbols.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sorted view (derived, not stored) ────────────────────────────────────
  const sorted = [...symbols].sort((a, b) => {
    const qa = quotes[a];
    const qb = quotes[b];
    if (sortKey === 'pct') {
      return (qb?.changePctToday ?? -Infinity) - (qa?.changePctToday ?? -Infinity);
    }
    if (sortKey === 'change') {
      return (qb?.changeToday ?? -Infinity) - (qa?.changeToday ?? -Infinity);
    }
    // default: alphabetical
    return a.localeCompare(b);
  });

  return { sorted, quotes, loading, add, remove, refresh, sortKey, setSortKey };
}