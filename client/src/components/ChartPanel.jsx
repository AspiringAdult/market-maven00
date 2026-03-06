import { useState, useMemo, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { BarChart2 } from 'lucide-react';

const RANGES = [
  { label: '1M', value: 30 },
  { label: '3M', value: 90 },
  { label: '6M', value: 180 },
  { label: '1Y', value: 365 },
  { label: 'ALL', value: Infinity },
];

export default function ChartPanel({ history, symbol, quote }) {

  const chartRef = useRef(null);
  const containerRef = useRef(null);

  const [rangeDays, setRangeDays] = useState(365);

  const chartData = useMemo(() => {
    if (!history?.length) return [];

    const filtered = rangeDays === Infinity
      ? history
      : history.slice(-rangeDays);

    return filtered.map((d) => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

  }, [history, rangeDays]);

  const pctChange = useMemo(() => {
    if (chartData.length < 2) return null;

    const first = chartData[0].close;
    const last  = chartData[chartData.length - 1].close;

    return (((last - first) / first) * 100).toFixed(2);

  }, [chartData]);

  useEffect(() => {

    if (!containerRef.current || !chartData.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0b1220' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({      upColor: '#10b981',
      downColor: '#f43f5e',
      borderDownColor: '#f43f5e',
      borderUpColor: '#10b981',
      wickDownColor: '#f43f5e',
      wickUpColor: '#10b981',
    });

    candleSeries.setData(chartData);

    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };

  }, [chartData]);

  if (!history?.length) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <div className="text-center text-muted">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-mono text-sm">No chart data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col h-full">

      {/* Header */}
      <div className="panel-header">

        <div className="flex items-center gap-3">
          <span className="panel-label">Price History</span>

          {pctChange !== null && (
            <span className={`font-mono text-xs font-bold ${
              parseFloat(pctChange) >= 0 ? 'text-up' : 'text-down'
            }`}>
              {parseFloat(pctChange) >= 0 ? '+' : ''}{pctChange}%
            </span>
          )}
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRangeDays(r.value)}
              className={`font-mono text-[10px] px-2.5 py-1 rounded transition-all
                ${rangeDays === r.value
                  ? 'bg-up/20 text-up border border-up/30'
                  : 'text-muted hover:text-text border border-transparent hover:border-border'
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>

      </div>

      {/* Candlestick Chart */}
      <div className="flex-1 p-4 min-h-[350px]">
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Footer */}
      <div className="px-5 pb-3 flex justify-between">
        <span className="panel-label">Candlesticks</span>
        <span className="font-mono text-[10px] text-muted">
          {chartData.length} candles
        </span>
      </div>

    </div>
  );
}