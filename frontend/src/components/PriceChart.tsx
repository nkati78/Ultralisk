import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<OverlayVisibility>(defaultVisibility);
  const [showPriceLines, setShowPriceLines] = useState(false);

  const toggle = (key: keyof OverlayVisibility) =>
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: containerRef.current.clientWidth,
      height: 350,
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });

    const pl = showPriceLines;

    // Price line (always visible)
    const priceSeries = chart.addSeries(LineSeries, {
      color: '#ffffff', lineWidth: 2,
      priceLineVisible: pl, lastValueVisible: pl,
    });
    priceSeries.setData(data.map((d) => ({ time: d.date, value: d.price })));

    // SMA 20
    if (visibility.sma20) {
      const sma20Data = data.filter((d) => d.sma_20 !== null);
      if (sma20Data.length > 0) {
        const s = chart.addSeries(LineSeries, {
          color: '#f59e0b', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        s.setData(sma20Data.map((d) => ({ time: d.date, value: d.sma_20! })));
      }
    }

    // SMA 50
    if (visibility.sma50) {
      const sma50Data = data.filter((d) => d.sma_50 !== null);
      if (sma50Data.length > 0) {
        const s = chart.addSeries(LineSeries, {
          color: '#8b5cf6', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        s.setData(sma50Data.map((d) => ({ time: d.date, value: d.sma_50! })));
      }
    }

    // EMA 9
    if (visibility.ema9) {
      const ema9Data = data.filter((d) => d.ema_9 !== null);
      if (ema9Data.length > 0) {
        const s = chart.addSeries(LineSeries, {
          color: '#06b6d4', lineWidth: 1, lineStyle: 2,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        s.setData(ema9Data.map((d) => ({ time: d.date, value: d.ema_9! })));
      }
    }

    // Bollinger Bands
    if (visibility.bollingerBands) {
      const bbData = data.filter((d) => d.bb_upper !== null);
      if (bbData.length > 0) {
        const upper = chart.addSeries(LineSeries, {
          color: 'rgba(239,68,68,0.4)', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        upper.setData(bbData.map((d) => ({ time: d.date, value: d.bb_upper! })));
        const lower = chart.addSeries(LineSeries, {
          color: 'rgba(239,68,68,0.4)', lineWidth: 1,
          priceLineVisible: pl, lastValueVisible: pl,
        });
        lower.setData(bbData.map((d) => ({ time: d.date, value: d.bb_lower! })));
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, visibility, showPriceLines]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {overlays.map((o) => (
          <button
            key={o.key}
            onClick={() => toggle(o.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              visibility[o.key]
                ? 'bg-white/10 text-white'
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
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
