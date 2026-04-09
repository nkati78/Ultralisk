import { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries, ColorType } from 'lightweight-charts';

interface Props {
  data: { date: string; equity: number }[];
}

export function EquityChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPriceLines, setShowPriceLines] = useState(false);

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
      crosshair: {
        horzLine: { color: 'rgba(255,255,255,0.1)' },
        vertLine: { color: 'rgba(255,255,255,0.1)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#3b82f6',
      topColor: 'rgba(59,130,246,0.3)',
      bottomColor: 'rgba(59,130,246,0.01)',
      lineWidth: 2,
      priceLineVisible: showPriceLines,
      lastValueVisible: showPriceLines,
    });

    series.setData(data.map((d) => ({ time: d.date, value: d.equity })));
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
  }, [data, showPriceLines]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
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
