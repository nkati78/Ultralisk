import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { IndicatorSnapshot } from '../types/api';

export interface OverlayVisibility {
  sma20: boolean;
  sma50: boolean;
  ema9: boolean;
  bollingerBands: boolean;
}

interface Props {
  data: IndicatorSnapshot[];
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

export function PriceChart({ data }: Props) {
  const priceContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<OverlayVisibility>(defaultVisibility);
  const [showPriceLines, setShowPriceLines] = useState(false);

  const hasRsi = data.some((d) => d.rsi_14 !== null);

  const toggle = (key: keyof OverlayVisibility) =>
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!priceContainerRef.current || data.length === 0) return;

    const charts: IChartApi[] = [];

    // --- Price chart ---
    const priceChart = createChart(priceContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: priceContainerRef.current.clientWidth,
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

    const priceSeries = priceChart.addSeries(LineSeries, {
      color: '#ffffff', lineWidth: 2,
      priceLineVisible: pl, lastValueVisible: pl,
    });
    priceSeries.setData(data.map((d) => ({ time: d.date, value: d.price })));

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
    };
  }, [data, visibility, showPriceLines, hasRsi]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
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
        <span className="w-px bg-white/10 mx-1" />
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
      <div ref={priceContainerRef} className="w-full" />

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
