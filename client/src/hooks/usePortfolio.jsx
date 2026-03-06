import { useState, useEffect, useCallback } from 'react';
import { fetchMultiQuote } from '../api/marketApi';

const LS_KEY = 'mm_portfolio_v2';

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

/**
 * Each position: { id, symbol, qty, buyPrice, addedAt }
 */
export function usePortfolio() {
  const [positions, setPositions] = useState(load);
  const [quotes,    setQuotes]    = useState({});
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(positions));
  }, [positions]);

  const addPosition = useCallback((symbol, qty, buyPrice) => {
    const pos = {
      id:       `${symbol}_${Date.now()}`,
      symbol:   symbol.trim().toUpperCase(),
      qty:      parseFloat(qty),
      buyPrice: parseFloat(buyPrice),
      addedAt:  new Date().toISOString(),
    };
    setPositions((prev) => [...prev, pos]);
  }, []);

  const removePosition = useCallback((id) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    const syms = [...new Set(positions.map((p) => p.symbol))];
    if (!syms.length) return;
    setLoading(true);
    try {
      const res = await fetchMultiQuote(syms);
      const map = {};
      res.forEach((q) => { if (q?.symbol) map[q.symbol] = q; });
      setQuotes(map);
    } finally { setLoading(false); }
  }, [positions]);

  useEffect(() => { refresh(); }, [positions.length]); // eslint-disable-line

  // Derived aggregates
  const enriched = positions.map((p) => {
    const q         = quotes[p.symbol];
    const curPrice  = q?.price ?? p.buyPrice;
    const curValue  = curPrice * p.qty;
    const costBasis = p.buyPrice * p.qty;
    const pnl       = curValue - costBasis;
    const pnlPct    = costBasis ? (pnl / costBasis) * 100 : 0;
    const dailyChg  = (q?.changePctToday ?? 0) / 100;
    const dailyPnl  = curValue * dailyChg;
    return { ...p, curPrice, curValue, costBasis, pnl, pnlPct, dailyPnl };
  });

  const totalValue    = enriched.reduce((s, p) => s + p.curValue, 0);
  const totalCost     = enriched.reduce((s, p) => s + p.costBasis, 0);
  const totalPnl      = totalValue - totalCost;
  const totalPnlPct   = totalCost ? (totalPnl / totalCost) * 100 : 0;
  const totalDailyPnl = enriched.reduce((s, p) => s + p.dailyPnl, 0);

  return {
    positions, enriched, quotes, loading,
    addPosition, removePosition, refresh,
    totalValue, totalCost, totalPnl, totalPnlPct, totalDailyPnl,
  };
}