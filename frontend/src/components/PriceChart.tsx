import { useEffect, useRef } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import type { IndicatorSnapshot } from '../types/api';

interface Props {
  data: IndicatorSnapshot[];
}

export function PriceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Price line
    const priceSeries = chart.addSeries(LineSeries, { color: '#ffffff', lineWidth: 2 });
    priceSeries.setData(data.map((d) => ({ time: d.date, value: d.price })));

    // SMA 20
    const sma20Data = data.filter((d) => d.sma_20 !== null);
    if (sma20Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1 });
      s.setData(sma20Data.map((d) => ({ time: d.date, value: d.sma_20! })));
    }

    // SMA 50
    const sma50Data = data.filter((d) => d.sma_50 !== null);
    if (sma50Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1 });
      s.setData(sma50Data.map((d) => ({ time: d.date, value: d.sma_50! })));
    }

    // EMA 9
    const ema9Data = data.filter((d) => d.ema_9 !== null);
    if (ema9Data.length > 0) {
      const s = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, lineStyle: 2 });
      s.setData(ema9Data.map((d) => ({ time: d.date, value: d.ema_9! })));
    }

    // Bollinger Bands
    const bbData = data.filter((d) => d.bb_upper !== null);
    if (bbData.length > 0) {
      const upper = chart.addSeries(LineSeries, { color: 'rgba(239,68,68,0.4)', lineWidth: 1 });
      upper.setData(bbData.map((d) => ({ time: d.date, value: d.bb_upper! })));
      const lower = chart.addSeries(LineSeries, { color: 'rgba(239,68,68,0.4)', lineWidth: 1 });
      lower.setData(bbData.map((d) => ({ time: d.date, value: d.bb_lower! })));
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
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
}
