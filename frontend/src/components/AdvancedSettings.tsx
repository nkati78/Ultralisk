import { useState } from 'react';
import type { AdvancedFilters } from '../types/api';

const TIMES = [
  '09:30', '09:45', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '15:45', '16:00',
];

const TIME_LABELS: Record<string, string> = {
  '09:30': '9:30 AM', '09:45': '9:45 AM', '10:00': '10:00 AM',
  '10:30': '10:30 AM', '11:00': '11:00 AM', '11:30': '11:30 AM',
  '12:00': '12:00 PM', '12:30': '12:30 PM', '13:00': '1:00 PM',
  '13:30': '1:30 PM', '14:00': '2:00 PM', '14:30': '2:30 PM',
  '15:00': '3:00 PM', '15:30': '3:30 PM', '15:45': '3:45 PM',
  '16:00': '4:00 PM',
};

interface Props {
  filters: AdvancedFilters;
  onChange: (f: AdvancedFilters) => void;
}

type TabKey = 'time' | 'rsi' | 'bollinger' | 'ma' | 'vwap';

export function AdvancedSettings({ filters, onChange }: Props) {
  const [tab, setTab] = useState<TabKey>('time');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'time', label: 'Time of Day' },
    { key: 'rsi', label: 'RSI' },
    { key: 'bollinger', label: 'Bollinger Bands' },
    { key: 'ma', label: 'SMA / EMA' },
    { key: 'vwap', label: 'VWAP' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[hsl(var(--border))]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'time' && (
        <div>
          <Toggle label="Enable Time-of-Day Filter" checked={filters.time_of_day.enabled}
            onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, enabled: v } })} />
          {filters.time_of_day.enabled && (
            <div className="grid grid-cols-2 gap-6 mt-3">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Entry Window</h4>
                <Select label="Earliest Entry" value={filters.time_of_day.entry_start} options={TIMES}
                  labels={TIME_LABELS}
                  onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, entry_start: v } })} />
                <Select label="Latest Entry" value={filters.time_of_day.entry_end} options={TIMES}
                  labels={TIME_LABELS}
                  onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, entry_end: v } })} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Exit Window</h4>
                <Select label="Earliest Exit" value={filters.time_of_day.exit_start} options={TIMES}
                  labels={TIME_LABELS}
                  onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, exit_start: v } })} />
                <Select label="Latest Exit" value={filters.time_of_day.exit_end} options={TIMES}
                  labels={TIME_LABELS}
                  onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, exit_end: v } })} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'rsi' && (
        <div>
          <Toggle label="Enable RSI Filter" checked={filters.rsi.enabled}
            onChange={(v) => onChange({ ...filters, rsi: { ...filters.rsi, enabled: v } })} />
          {filters.rsi.enabled && (
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <label className="label">RSI Min</label>
                <input type="range" min={0} max={100} value={filters.rsi.rsi_min}
                  onChange={(e) => onChange({ ...filters, rsi: { ...filters.rsi, rsi_min: Number(e.target.value) } })}
                  className="w-full accent-blue-500" />
                <span className="text-sm font-mono text-white">{filters.rsi.rsi_min}</span>
              </div>
              <div>
                <label className="label">RSI Max</label>
                <input type="range" min={0} max={100} value={filters.rsi.rsi_max}
                  onChange={(e) => onChange({ ...filters, rsi: { ...filters.rsi, rsi_max: Number(e.target.value) } })}
                  className="w-full accent-blue-500" />
                <span className="text-sm font-mono text-white">{filters.rsi.rsi_max}</span>
              </div>
              <div>
                <Select label="RSI Zone" value={filters.rsi.rsi_zone}
                  options={['any', 'oversold', 'neutral', 'overbought']}
                  labels={{ any: 'Any', oversold: 'Oversold (< 30)', neutral: 'Neutral (30-70)', overbought: 'Overbought (> 70)' }}
                  onChange={(v) => onChange({ ...filters, rsi: { ...filters.rsi, rsi_zone: v } })} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'bollinger' && (
        <div>
          <Toggle label="Enable Bollinger Bands Filter" checked={filters.bollinger.enabled}
            onChange={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, enabled: v } })} />
          {filters.bollinger.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Select label="Price Position" value={filters.bollinger.position}
                options={['any', 'below_lower', 'lower_half', 'upper_half', 'above_upper']}
                labels={{ any: 'Any', below_lower: 'Below Lower Band', lower_half: 'Lower Half', upper_half: 'Upper Half', above_upper: 'Above Upper Band' }}
                onChange={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, position: v } })} />
              <div>
                <Toggle label="Use %B Range" checked={filters.bollinger.use_pct_b}
                  onChange={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, use_pct_b: v } })} />
                {filters.bollinger.use_pct_b && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="label">%B Min</label>
                      <input type="number" className="input-field" step={0.05}
                        value={filters.bollinger.pct_b_min}
                        onChange={(e) => onChange({ ...filters, bollinger: { ...filters.bollinger, pct_b_min: Number(e.target.value) } })} />
                    </div>
                    <div>
                      <label className="label">%B Max</label>
                      <input type="number" className="input-field" step={0.05}
                        value={filters.bollinger.pct_b_max}
                        onChange={(e) => onChange({ ...filters, bollinger: { ...filters.bollinger, pct_b_max: Number(e.target.value) } })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'ma' && (
        <div>
          <Toggle label="Enable Moving Average Filter" checked={filters.moving_average.enabled}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, enabled: v } })} />
          {filters.moving_average.enabled && (
            <div className="grid grid-cols-2 gap-6 mt-3">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Price vs. Moving Average</h4>
                {(['sma_20', 'sma_50', 'sma_200'] as const).map((key) => (
                  <Select key={key} label={key.toUpperCase().replace('_', '(')+')'}
                    value={filters.moving_average[key]}
                    options={['ignore', 'above', 'below']}
                    labels={{ ignore: 'Ignore', above: 'Price Above', below: 'Price Below' }}
                    onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, [key]: v } })} />
                ))}
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-2">EMA & Crossover</h4>
                {(['ema_9', 'ema_21'] as const).map((key) => (
                  <Select key={key} label={key.toUpperCase().replace('_', '(')+')'}
                    value={filters.moving_average[key]}
                    options={['ignore', 'above', 'below']}
                    labels={{ ignore: 'Ignore', above: 'Price Above', below: 'Price Below' }}
                    onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, [key]: v } })} />
                ))}
                <Select label="SMA(20) vs SMA(50)"
                  value={filters.moving_average.sma_cross}
                  options={['ignore', 'bullish', 'bearish']}
                  labels={{ ignore: 'Ignore', bullish: 'SMA(20) Above (Bullish)', bearish: 'SMA(20) Below (Bearish)' }}
                  onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, sma_cross: v } })} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'vwap' && (
        <div>
          <Toggle label="Enable VWAP Filter" checked={filters.vwap.enabled}
            onChange={(v) => onChange({ ...filters, vwap: { ...filters.vwap, enabled: v } })} />
          {filters.vwap.enabled && (
            <Select label="Price vs. VWAP" value={filters.vwap.direction}
              options={['above', 'below']}
              labels={{ above: 'Price Above VWAP', below: 'Price Below VWAP' }}
              onChange={(v) => onChange({ ...filters, vwap: { ...filters.vwap, direction: v } })} />
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-500" />
      <span className="text-sm text-white">{label}</span>
    </label>
  );
}

function Select({ label, value, options, labels, onChange }: {
  label: string; value: string; options: string[];
  labels?: Record<string, string>; onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2">
      <label className="label">{label}</label>
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}
