import { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries, LineSeries, ColorType, createSeriesMarkers } from 'lightweight-charts';
import type { TradeResult } from '../types/api';

interface Props {
  data: { date: string; equity: number }[];
  trades?: TradeResult[];
  sp500?: { date: string; value: number }[];
  startingCash?: number;
}

function formatCurrency(v: number): string {
  return v >= 0
    ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EquityChart({ data, trades = [], sp500 = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: container.clientWidth,
      height: 500,
      crosshair: {
        horzLine: { color: 'rgba(255,255,255,0.1)' },
        vertLine: { color: 'rgba(255,255,255,0.1)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
      handleScale: { mouseWheel: false },
    });

    // S&P 500 benchmark (behind equity curve)
    if (showBenchmark && sp500.length > 0) {
      const benchmarkSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      benchmarkSeries.setData(sp500.map((d) => ({ time: d.date, value: d.value })));
    }

    // Equity curve (on top)
    const equitySeries = chart.addSeries(AreaSeries, {
      lineColor: '#1DE9B6',
      topColor: 'rgba(29,233,182,0.25)',
      bottomColor: 'rgba(29,233,182,0.01)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    equitySeries.setData(data.map((d) => ({ time: d.date, value: d.equity })));

    // Trade markers
    const tradesByDate = new Map<string, TradeResult[]>();
    if (showMarkers && trades.length > 0) {
      const equityDates = new Set(data.map((d) => d.date));

      for (const t of trades) {
        if (!equityDates.has(t.exit_date)) continue;
        const existing = tradesByDate.get(t.exit_date) || [];
        existing.push(t);
        tradesByDate.set(t.exit_date, existing);
      }

      const markers = trades
        .filter((t) => equityDates.has(t.exit_date))
        .map((t) => ({
          time: t.exit_date,
          position: (t.pnl >= 0 ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
          color: t.pnl >= 0 ? '#10b981' : '#f87171',
          shape: 'circle' as const,
          size: 0.5,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      createSeriesMarkers(equitySeries, markers);
    }

    // Tooltip on crosshair move
    const tooltip = tooltipRef.current;
    if (tooltip && showMarkers && trades.length > 0) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          tooltip.style.display = 'none';
          return;
        }

        const dateStr = param.time as string;
        const dateTrades = tradesByDate.get(dateStr);

        if (!dateTrades || dateTrades.length === 0) {
          tooltip.style.display = 'none';
          return;
        }

        const lines = dateTrades.map((t) => {
          const pnlColor = t.pnl >= 0 ? '#10b981' : '#f87171';
          return `<div style="display:flex;justify-content:space-between;gap:12px;">
            <span style="color:#9ca3af;">${t.exit_date}</span>
            <span style="color:${pnlColor};font-weight:600;">${formatCurrency(t.pnl)}</span>
          </div>`;
        });

        tooltip.innerHTML = lines.join('');
        tooltip.style.display = 'block';

        // Position tooltip near crosshair
        const x = param.point.x;
        const y = param.point.y;
        const chartRect = container.getBoundingClientRect();
        const tooltipWidth = 200;
        const tooltipHeight = tooltip.offsetHeight || 40;

        let left = x + 16;
        if (left + tooltipWidth > chartRect.width) {
          left = x - tooltipWidth - 16;
        }
        let top = y - tooltipHeight / 2;
        if (top < 0) top = 4;
        if (top + tooltipHeight > chartRect.height) top = chartRect.height - tooltipHeight - 4;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (container) {
        chart.applyOptions({ width: container.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      if (tooltip) tooltip.style.display = 'none';
    };
  }, [data, trades, sp500, showBenchmark, showMarkers]);

  return (
    <div>
      {/* Legend + toggles */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs">
        <span className="flex items-center gap-1.5 text-gray-300 font-medium">
          <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: '#1DE9B6' }} />
          Strategy
        </span>
        <button
          onClick={() => setShowBenchmark((p) => !p)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-colors ${
            showBenchmark
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-400'
          }`}
        >
          <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: '#f59e0b', opacity: showBenchmark ? 1 : 0.4 }} />
          S&P 500
        </button>
        <button
          onClick={() => setShowMarkers((p) => !p)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-colors ${
            showMarkers
              ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
              : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-400'
          }`}
        >
          <span className="flex gap-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: showMarkers ? '#10b981' : '#6b7280' }} />
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: showMarkers ? '#f87171' : '#6b7280' }} />
          </span>
          Trades
        </button>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} className="w-full" />
        {/* Tooltip overlay */}
        <div
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            zIndex: 10,
            pointerEvents: 'none',
            backgroundColor: 'hsl(220 14% 14% / 0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            minWidth: '160px',
            backdropFilter: 'blur(8px)',
          }}
        />
      </div>
    </div>
  );
}
