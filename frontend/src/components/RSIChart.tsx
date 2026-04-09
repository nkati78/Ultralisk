import { useEffect, useRef } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import type { IndicatorSnapshot } from '../types/api';

interface Props {
  data: IndicatorSnapshot[];
}

export function RSIChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      height: 200,
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });

    const series = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2 });
    series.setData(rsiData.map((d) => ({ time: d.date, value: d.rsi_14! })));

    // Overbought/oversold lines
    series.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: 2 });
    series.createPriceLine({ price: 30, color: 'rgba(34,197,94,0.5)', lineWidth: 1, lineStyle: 2 });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
}
