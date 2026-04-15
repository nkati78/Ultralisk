import type { AdvancedFilters } from '../types/api';
import { InfoTip } from './InfoTip';

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

export function AdvancedSettings({ filters, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Time of Day */}
      <FilterSection
        label="Time of Day"
        tip="Restrict when trades can be opened or closed based on market hours."
        enabled={filters.time_of_day.enabled}
        onToggle={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, enabled: v } })}
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <InlineSelect label="Entry Start" value={filters.time_of_day.entry_start} options={TIMES} labels={TIME_LABELS}
            onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, entry_start: v } })} />
          <InlineSelect label="Entry End" value={filters.time_of_day.entry_end} options={TIMES} labels={TIME_LABELS}
            onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, entry_end: v } })} />
          <InlineSelect label="Exit Start" value={filters.time_of_day.exit_start} options={TIMES} labels={TIME_LABELS}
            onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, exit_start: v } })} />
          <InlineSelect label="Exit End" value={filters.time_of_day.exit_end} options={TIMES} labels={TIME_LABELS}
            onChange={(v) => onChange({ ...filters, time_of_day: { ...filters.time_of_day, exit_end: v } })} />
        </div>
      </FilterSection>

      {/* RSI */}
      <FilterSection
        label="RSI"
        tip="Only enter trades when the Relative Strength Index (14-period) is within the specified range."
        enabled={filters.rsi.enabled}
        onToggle={(v) => onChange({ ...filters, rsi: { ...filters.rsi, enabled: v } })}
      >
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          <InlineNumber label="Min" value={filters.rsi.rsi_min} min={0} max={100}
            onChange={(v) => onChange({ ...filters, rsi: { ...filters.rsi, rsi_min: v } })} />
          <InlineNumber label="Max" value={filters.rsi.rsi_max} min={0} max={100}
            onChange={(v) => onChange({ ...filters, rsi: { ...filters.rsi, rsi_max: v } })} />
          <InlineSelect label="Zone" value={filters.rsi.rsi_zone}
            options={['any', 'oversold', 'neutral', 'overbought']}
            labels={{ any: 'Any', oversold: 'Oversold', neutral: 'Neutral', overbought: 'Overbought' }}
            onChange={(v) => onChange({ ...filters, rsi: { ...filters.rsi, rsi_zone: v } })} />
        </div>
      </FilterSection>

      {/* Bollinger Bands */}
      <FilterSection
        label="Bollinger Bands"
        tip="Only enter trades when price is at a specific position relative to the Bollinger Bands (20-period, 2 std dev)."
        enabled={filters.bollinger.enabled}
        onToggle={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, enabled: v } })}
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <InlineSelect label="Position" value={filters.bollinger.position}
            options={['any', 'below_lower', 'lower_half', 'upper_half', 'above_upper']}
            labels={{ any: 'Any', below_lower: 'Below Lower', lower_half: 'Lower Half', upper_half: 'Upper Half', above_upper: 'Above Upper' }}
            onChange={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, position: v } })} />
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer mb-1">
              <input type="checkbox" checked={filters.bollinger.use_pct_b}
                onChange={(e) => onChange({ ...filters, bollinger: { ...filters.bollinger, use_pct_b: e.target.checked } })}
                className="w-3.5 h-3.5 rounded accent-blue-500" />
              <span className="text-xs text-gray-300">Use %B</span>
            </label>
            {filters.bollinger.use_pct_b && (
              <div className="grid grid-cols-2 gap-2">
                <InlineNumber label="Min" value={filters.bollinger.pct_b_min} step={0.05}
                  onChange={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, pct_b_min: v } })} />
                <InlineNumber label="Max" value={filters.bollinger.pct_b_max} step={0.05}
                  onChange={(v) => onChange({ ...filters, bollinger: { ...filters.bollinger, pct_b_max: v } })} />
              </div>
            )}
          </div>
        </div>
      </FilterSection>

      {/* SMA / EMA */}
      <FilterSection
        label="SMA / EMA"
        tip="Only enter trades when price is above or below specified moving averages, or when a crossover condition is met."
        enabled={filters.moving_average.enabled}
        onToggle={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, enabled: v } })}
      >
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          <InlineSelect label="SMA(20)" value={filters.moving_average.sma_20}
            options={['ignore', 'above', 'below']} labels={{ ignore: 'Ignore', above: 'Above', below: 'Below' }}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, sma_20: v } })} />
          <InlineSelect label="SMA(50)" value={filters.moving_average.sma_50}
            options={['ignore', 'above', 'below']} labels={{ ignore: 'Ignore', above: 'Above', below: 'Below' }}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, sma_50: v } })} />
          <InlineSelect label="SMA(200)" value={filters.moving_average.sma_200}
            options={['ignore', 'above', 'below']} labels={{ ignore: 'Ignore', above: 'Above', below: 'Below' }}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, sma_200: v } })} />
          <InlineSelect label="EMA(9)" value={filters.moving_average.ema_9}
            options={['ignore', 'above', 'below']} labels={{ ignore: 'Ignore', above: 'Above', below: 'Below' }}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, ema_9: v } })} />
          <InlineSelect label="EMA(21)" value={filters.moving_average.ema_21}
            options={['ignore', 'above', 'below']} labels={{ ignore: 'Ignore', above: 'Above', below: 'Below' }}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, ema_21: v } })} />
          <InlineSelect label="Cross" value={filters.moving_average.sma_cross}
            options={['ignore', 'bullish', 'bearish']} labels={{ ignore: 'Ignore', bullish: 'Bullish', bearish: 'Bearish' }}
            onChange={(v) => onChange({ ...filters, moving_average: { ...filters.moving_average, sma_cross: v } })} />
        </div>
      </FilterSection>

      {/* VWAP */}
      <FilterSection
        label="VWAP"
        tip="Volume-Weighted Average Price. Only enter trades when price is above or below the VWAP line."
        enabled={filters.vwap.enabled}
        onToggle={(v) => onChange({ ...filters, vwap: { ...filters.vwap, enabled: v } })}
      >
        <InlineSelect label="Price vs VWAP" value={filters.vwap.direction}
          options={['above', 'below']} labels={{ above: 'Above', below: 'Below' }}
          onChange={(v) => onChange({ ...filters, vwap: { ...filters.vwap, direction: v } })} />
      </FilterSection>
    </div>
  );
}

function FilterSection({ label, tip, enabled, onToggle, children }: {
  label: string; tip: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: enabled ? 'hsl(var(--accent) / 0.3)' : 'rgba(255,255,255,0.06)', backgroundColor: enabled ? 'hsl(var(--accent) / 0.03)' : 'rgba(255,255,255,0.02)' }}>
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-blue-500" />
        <span className="text-sm font-medium" style={{ color: enabled ? 'white' : '#9ca3af' }}>{label}</span>
        <InfoTip text={tip} />
      </label>
      <div style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

function InlineSelect({ label, value, options, labels, onChange }: {
  label: string; value: string; options: string[];
  labels?: Record<string, string>; onChange: (v: string) => void;
}) {
  return (
    <div className="mb-1">
      <label className="block mb-0.5" style={{ fontSize: '14px', color: '#d1d5db' }}>{label}</label>
      <select className="input-field !py-1 !text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}

function InlineNumber({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="mb-1">
      <label className="block mb-0.5" style={{ fontSize: '14px', color: '#d1d5db' }}>{label}</label>
      <input type="number" className="input-field !py-1 !text-xs" value={value}
        min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
