import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, ColorType, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { IndicatorSnapshot, TradeResult } from '../types/api';

export interface OverlayVisibility {
  sma20: boolean;
  sma50: boolean;
  ema9: boolean;
  bollingerBands: boolean;
}

interface Props {
  data: IndicatorSnapshot[];
  trades?: TradeResult[];
  sp500?: { date: string; value: number }[];
  startingCash?: number;
}

const defaultVisibility: OverlayVisibility = {
  sma20: false,
  sma50: false,
  ema9: false,
  bollingerBands: false,
};

const overlays: { key: keyof OverlayVisibility; label: string; color: string; dashed?: boolean }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#f59e0b' },
  { key: 'sma50', label: 'SMA 50', color: '#8b5cf6' },
  { key: 'ema9', label: 'EMA 9', color: '#06b6d4', dashed: true },
  { key: 'bollingerBands', label: 'Bollinger Bands', color: '#ef4444' },
];

function formatCurrency(v: number): string {
  return v >= 0
    ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PriceChart({ data, trades = [], sp500 = [], startingCash }: Props) {
  const priceContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<OverlayVisibility>(defaultVisibility);
  const [showPriceLines, setShowPriceLines] = useState(false);
  const [showSP500, setShowSP500] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  const hasRsi = data.some((d) => d.rsi_14 !== null);

  const toggle = (key: keyof OverlayVisibility) =>
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!priceContainerRef.current || data.length === 0) return;

    const container = priceContainerRef.current;
    const charts: IChartApi[] = [];

    // --- Price chart ---
    const priceChart = createChart(container, {
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
      height: 400,
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        visible: !hasRsi,
      },
      handleScale: { mouseWheel: false },
    });
    charts.push(priceChart);

    const pl = showPriceLines;

    // S&P 500 scaled to underlying price (behind everything)
    if (showSP500 && sp500.length > 0 && data.length > 0) {
      const firstPrice = data[0].price;
      const cash = startingCash ?? 100000;
      const sp500Series = priceChart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const priceDates = new Set(data.map((d) => d.date));
      // Scale S&P 500 returns to underlying price level
      const firstSP = sp500[0]?.value ?? cash;
      const sp500Data = sp500
        .filter((d) => priceDates.has(d.date))
        .map((d) => ({
          time: d.date,
          value: (d.value / firstSP) * firstPrice,
        }));

      sp500Series.setData(sp500Data);
    }

    const priceSeries = priceChart.addSeries(LineSeries, {
      color: '#ffffff', lineWidth: 2,
      priceLineVisible: pl, lastValueVisible: pl,
    });
    priceSeries.setData(data.map((d) => ({ time: d.date, value: d.price })));

    // Trade markers on price series
    const tradesByDate = new Map<string, TradeResult[]>();
    if (showTrades && trades.length > 0) {
      const priceDates = new Set(data.map((d) => d.date));

      for (const t of trades) {
        if (!priceDates.has(t.exit_date)) continue;
        const existing = tradesByDate.get(t.exit_date) || [];
        existing.push(t);
        tradesByDate.set(t.exit_date, existing);
      }

      const markers = trades
        .filter((t) => priceDates.has(t.exit_date))
        .map((t) => ({
          time: t.exit_date,
          position: (t.pnl >= 0 ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
          color: t.pnl >= 0 ? '#10b981' : '#f87171',
          shape: 'circle' as const,
          size: 0.5,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      createSeriesMarkers(priceSeries, markers);
    }

    // Tooltip for trade markers
    const tooltip = tooltipRef.current;
    if (tooltip && showTrades && trades.length > 0) {
      priceChart.subscribeCrosshairMove((param) => {
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

        const x = param.point.x;
        const y = param.point.y;
        const chartRect = container.getBoundingClientRect();
        const tooltipWidth = 200;
        const tooltipHeight = tooltip.offsetHeight || 40;

        let left = x + 16;
        if (left + tooltipWidth > chartRect.width) left = x - tooltipWidth - 16;
        let top = y - tooltipHeight / 2;
        if (top < 0) top = 4;
        if (top + tooltipHeight > chartRect.height) top = chartRect.height - tooltipHeight - 4;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });
    }

    if (visibility.sma20) {
      const sma20Data = data.filter((d) => d.sma_20 !== null);
      if (sma20Data.length > 0) {
        const s = priceChart.addSeries(LineSeries, {
          color: '#f59e0b', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        s.setData(sma20Data.map((d) => ({ time: d.date, value: d.sma_20! })));
      }
    }

    if (visibility.sma50) {
      const sma50Data = data.filter((d) => d.sma_50 !== null);
      if (sma50Data.length > 0) {
        const s = priceChart.addSeries(LineSeries, {
          color: '#8b5cf6', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        s.setData(sma50Data.map((d) => ({ time: d.date, value: d.sma_50! })));
      }
    }

    if (visibility.ema9) {
      const ema9Data = data.filter((d) => d.ema_9 !== null);
      if (ema9Data.length > 0) {
        const s = priceChart.addSeries(LineSeries, {
          color: '#06b6d4', lineWidth: 1, lineStyle: 2,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        s.setData(ema9Data.map((d) => ({ time: d.date, value: d.ema_9! })));
      }
    }

    if (visibility.bollingerBands) {
      const bbData = data.filter((d) => d.bb_upper !== null);
      if (bbData.length > 0) {
        const upper = priceChart.addSeries(LineSeries, {
          color: 'rgba(239,68,68,0.4)', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        upper.setData(bbData.map((d) => ({ time: d.date, value: d.bb_upper! })));
        const lower = priceChart.addSeries(LineSeries, {
          color: 'rgba(239,68,68,0.4)', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        lower.setData(bbData.map((d) => ({ time: d.date, value: d.bb_lower! })));
      }
    }

    priceChart.timeScale().fitContent();

    // --- RSI sub-chart ---
    let rsiChart: IChartApi | null = null;
    if (hasRsi && rsiContainerRef.current) {
      const rsiData = data.filter((d) => d.rsi_14 !== null);
      rsiChart = createChart(rsiContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        width: rsiContainerRef.current.clientWidth,
        height: 150,
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
        handleScale: { mouseWheel: false },
      });
      charts.push(rsiChart);

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#1DE9B6', lineWidth: 2,
        priceLineVisible: pl, lastValueVisible: pl,
      });
      rsiSeries.setData(rsiData.map((d) => ({ time: d.date, value: d.rsi_14! })));

      rsiSeries.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.6)', lineWidth: 1, lineStyle: 2 });
      rsiSeries.createPriceLine({ price: 30, color: 'rgba(29,233,182,0.6)', lineWidth: 1, lineStyle: 2 });

      rsiChart.timeScale().fitContent();

      // Sync time scales
      priceChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) rsiChart!.timeScale().setVisibleLogicalRange(range);
      });
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) priceChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    const handleResize = () => {
      if (priceContainerRef.current) {
        priceChart.applyOptions({ width: priceContainerRef.current.clientWidth });
      }
      if (rsiContainerRef.current && rsiChart) {
        rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      charts.forEach((c) => c.remove());
      if (tooltip) tooltip.style.display = 'none';
    };
  }, [data, trades, sp500, startingCash, visibility, showPriceLines, showSP500, showTrades, hasRsi]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Always-on legend */}
        <span className="flex items-center gap-1.5 text-gray-300 text-xs font-medium">
          <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: '#ffffff' }} />
          Price
        </span>
        <span className="w-px h-4 bg-white/10" />
        {/* Indicator overlays */}
        {overlays.map((o) => (
          <button
            key={o.key}
            onClick={() => toggle(o.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              visibility[o.key]
                ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
                : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-400'
            }`}
          >
            <span
              className="inline-block w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: o.color,
                opacity: visibility[o.key] ? 1 : 0.4,
                borderTop: o.dashed ? '1px dashed' : undefined,
              }}
            />
            {o.label}
          </button>
        ))}
        <span className="w-px h-4 bg-white/10" />
        {/* S&P 500 toggle */}
        <button
          onClick={() => setShowSP500((p) => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            showSP500
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-400'
          }`}
        >
          <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: '#f59e0b', opacity: showSP500 ? 1 : 0.4 }} />
          S&P 500
        </button>
        {/* Trades toggle */}
        <button
          onClick={() => setShowTrades((p) => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            showTrades
              ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
              : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-400'
          }`}
        >
          <span className="flex gap-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: showTrades ? '#10b981' : '#6b7280' }} />
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: showTrades ? '#f87171' : '#6b7280' }} />
          </span>
          Trades
        </button>
        <span className="w-px h-4 bg-white/10" />
        {/* Price lines */}
        <button
          onClick={() => setShowPriceLines((p) => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            showPriceLines
              ? 'bg-white/10 text-white'
              : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-400'
          }`}
        >
          <span className="inline-block w-3 border-t border-dashed border-gray-400" style={{ opacity: showPriceLines ? 1 : 0.4 }} />
          Price Lines
        </button>
      </div>

      {/* Price chart */}
      <div style={{ position: 'relative' }}>
        <div ref={priceContainerRef} className="w-full" />
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

      {/* RSI sub-chart */}
      {hasRsi && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1 mb-1 border-t border-white/[0.06] pt-2">
            <span className="font-medium text-gray-300">RSI (14)</span>
            <span><span className="inline-block w-3 h-0.5 mr-1 align-middle" style={{ backgroundColor: '#1DE9B6' }} />RSI</span>
            <span><span className="inline-block w-3 h-0.5 bg-red-500/60 mr-1 align-middle" style={{ borderTop: '1px dashed' }} />Overbought (70)</span>
            <span><span className="inline-block w-3 h-0.5 mr-1 align-middle" style={{ backgroundColor: 'rgba(29,233,182,0.6)', borderTop: '1px dashed' }} />Oversold (30)</span>
          </div>
          <div ref={rsiContainerRef} className="w-full" />
        </>
      )}
    </div>
  );
}
