import type { StrategyConfig, SyntheticDataConfig } from '../types/api';

const STRATEGIES = [
  { key: 'short_put_spread', name: 'Short Put Vertical Spread' },
  { key: 'short_call_spread', name: 'Short Call Vertical Spread' },
  { key: 'covered_call', name: 'Covered Call' },
  { key: 'protective_put', name: 'Protective Put' },
  { key: 'iron_condor', name: 'Iron Condor' },
  { key: 'straddle', name: 'Long Straddle' },
];

interface SidebarProps {
  strategy: StrategyConfig;
  onStrategyChange: (s: StrategyConfig) => void;
  ticker: string;
  onTickerChange: (t: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  startingCash: number;
  onStartingCashChange: (c: number) => void;
  commission: number;
  onCommissionChange: (c: number) => void;
  syntheticConfig: SyntheticDataConfig;
  onSyntheticConfigChange: (c: SyntheticDataConfig) => void;
  onRunBacktest: () => void;
  isLoading: boolean;
}

export function Sidebar({
  strategy, onStrategyChange,
  ticker, onTickerChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange,
  startingCash, onStartingCashChange,
  commission, onCommissionChange,
  syntheticConfig, onSyntheticConfigChange,
  onRunBacktest, isLoading,
}: SidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 overflow-y-auto h-screen sticky top-0">
      <h1 className="text-xl font-bold mb-6 text-white tracking-tight">Ultralisk</h1>

      {/* Strategy */}
      <Section title="Strategy">
        <select
          className="input-field"
          value={strategy.type}
          onChange={(e) => onStrategyChange({ ...strategy, type: e.target.value })}
        >
          {STRATEGIES.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
      </Section>

      {/* Ticker & Timeframe */}
      <Section title="Ticker & Timeframe">
        <label className="label">Ticker</label>
        <input
          className="input-field"
          value={ticker}
          onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="label">Start</label>
            <input type="date" className="input-field" value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)} />
          </div>
          <div>
            <label className="label">End</label>
            <input type="date" className="input-field" value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
        </div>
      </Section>

      {/* Capital */}
      <Section title="Capital">
        <label className="label">Starting Cash ($)</label>
        <input type="number" className="input-field" value={startingCash}
          onChange={(e) => onStartingCashChange(Number(e.target.value))} />
        <label className="label mt-2">Commission/Contract ($)</label>
        <input type="number" className="input-field" step="0.05" value={commission}
          onChange={(e) => onCommissionChange(Number(e.target.value))} />
      </Section>

      {/* Synthetic Data */}
      <Section title="Synthetic Data">
        <label className="label">Start Price ($)</label>
        <input type="number" className="input-field" value={syntheticConfig.start_price}
          onChange={(e) => onSyntheticConfigChange({ ...syntheticConfig, start_price: Number(e.target.value) })} />
        <label className="label mt-2">Daily Drift</label>
        <input type="number" className="input-field" step="0.0001" value={syntheticConfig.daily_drift}
          onChange={(e) => onSyntheticConfigChange({ ...syntheticConfig, daily_drift: Number(e.target.value) })} />
        <label className="label mt-2">Base IV</label>
        <input type="number" className="input-field" step="0.01" value={syntheticConfig.base_iv}
          onChange={(e) => onSyntheticConfigChange({ ...syntheticConfig, base_iv: Number(e.target.value) })} />
        <label className="label mt-2">Seed</label>
        <input type="number" className="input-field" value={syntheticConfig.seed}
          onChange={(e) => onSyntheticConfigChange({ ...syntheticConfig, seed: Number(e.target.value) })} />
      </Section>

      {/* Run button */}
      <button
        onClick={onRunBacktest}
        disabled={isLoading}
        className="w-full mt-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
      >
        {isLoading ? 'Running...' : 'Run Backtest'}
      </button>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">{title}</h3>
      {children}
    </div>
  );
}
