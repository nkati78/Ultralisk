import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import type { IndicatorSnapshot } from '../types/api';

interface Props {
  data: IndicatorSnapshot[];
}

export function RSIChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPriceLines, setShowPriceLines] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const rsiData = data.filter((d) => d.rsi_14 !== null);
    if (rsiData.length === 0) return;

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
      handleScale: { mouseWheel: false },
    });

    const series = chart.addSeries(LineSeries, {
      color: '#1DE9B6',
      lineWidth: 2,
      priceLineVisible: showPriceLines,
      lastValueVisible: showPriceLines,
    });
    series.setData(rsiData.map((d) => ({ time: d.date, value: d.rsi_14! })));

    // Overbought/oversold lines
    series.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.6)', lineWidth: 1, lineStyle: 2 });
    series.createPriceLine({ price: 30, color: 'rgba(29,233,182,0.6)', lineWidth: 1, lineStyle: 2 });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, showPriceLines]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setShowPriceLines((p) => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            showPriceLines
              ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
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
