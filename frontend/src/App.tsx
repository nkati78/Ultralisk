import { useState } from 'react';
import { StrategyPanel } from './components/StrategyPanel';
import { AdvancedSettings } from './components/AdvancedSettings';
import { MetricCard } from './components/MetricCard';
import { EquityChart } from './components/EquityChart';
import { PriceChart } from './components/PriceChart';
import { TradeLog } from './components/TradeLog';
import { runBacktest } from './lib/api';
import { formatCurrency, formatPct } from './lib/utils';
import type {
  StrategyConfig, AdvancedFilters, SyntheticDataConfig, BacktestResponse,
} from './types/api';

const SINGLE_LEG = [
  { key: 'long_call', name: 'Long Call', tag: 'Bullish' },
  { key: 'long_put', name: 'Long Put', tag: 'Bearish' },
  { key: 'short_call', name: 'Short Call', tag: 'Bearish' },
  { key: 'short_put', name: 'Short Put', tag: 'Bullish' },
];

const STRATEGIES = [
  { key: 'short_put_spread', name: 'Short Put Spread', tag: 'Bullish' },
  { key: 'short_call_spread', name: 'Short Call Spread', tag: 'Bearish' },
  { key: 'covered_call', name: 'Covered Call', tag: 'Bullish' },
  { key: 'protective_put', name: 'Protective Put', tag: 'Bearish' },
  { key: 'iron_condor', name: 'Iron Condor', tag: 'Neutral' },
  { key: 'straddle', name: 'Long Straddle', tag: 'Directional' },
];

/* Sensible defaults per strategy type */
const STRATEGY_DEFAULTS: Record<string, Partial<StrategyConfig>> = {
  long_call: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  long_put: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  short_call: { min_dte: 25, max_dte: 45, short_delta: 0.25, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  short_put: { min_dte: 25, max_dte: 45, short_delta: 0.25, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  short_put_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  short_call_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  covered_call: { min_dte: 30, max_dte: 45, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 5 },
  protective_put: { min_dte: 30, max_dte: 60, put_delta: -0.2, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  iron_condor: { min_dte: 30, max_dte: 45, short_delta: 0.15, wing_width: 5, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  straddle: { min_dte: 20, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
};

const TAG_COLORS: Record<string, string> = {
  Bullish: 'text-green-400',
  Bearish: 'text-red-400',
  Neutral: 'text-yellow-400',
  Directional: 'text-blue-400',
};

function StrategyCard({ name, tag, selected, onClick }: {
  name: string; tag: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 px-3 py-4 rounded-xl border transition-all text-center ${
        selected
          ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)] shadow-lg shadow-[hsl(var(--accent)/0.15)]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[hsl(var(--accent))]" />
      )}
      <span className={`text-sm font-semibold ${selected ? 'text-[hsl(var(--accent))]' : 'text-white'}`}>
        {name}
      </span>
      <span className={`text-[10px] ${TAG_COLORS[tag] ?? 'text-gray-500'}`}>
        {tag.toLowerCase()}
      </span>
    </button>
  );
}

function App() {
  const [strategy, setStrategy] = useState<StrategyConfig>({
    type: 'short_put_spread', min_dte: 25, max_dte: 45, short_delta: 0.25,
    spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5,
    close_at_loss_pct: 2.0, close_at_dte: 7, put_delta: -0.2, wing_width: 5,
  });
  const [filters, setFilters] = useState<AdvancedFilters>({
    time_of_day: { enabled: true, entry_start: '09:30', entry_end: '16:00', exit_start: '09:30', exit_end: '16:00' },
    rsi: { enabled: true, rsi_min: 20, rsi_max: 80, rsi_zone: 'any' },
    bollinger: { enabled: true, position: 'any', use_pct_b: false, pct_b_min: 0, pct_b_max: 0.2 },
    moving_average: { enabled: true, sma_20: 'ignore', sma_50: 'ignore', sma_200: 'ignore', ema_9: 'ignore', ema_21: 'ignore', sma_cross: 'ignore' },
    vwap: { enabled: true, direction: 'above' },
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [syntheticConfig] = useState<SyntheticDataConfig>({
    start_price: 450, daily_drift: 0.0003, base_iv: 0.25, seed: 42,
  });
  const [ticker, setTicker] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-03');
  const [endDate, setEndDate] = useState('2024-01-03');
  const [startingCash, setStartingCash] = useState(100000);
  const [commission, setCommission] = useState(0.65);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStrategyChange = (key: string) => {
    const defaults = STRATEGY_DEFAULTS[key] ?? {};
    setStrategy({ ...strategy, type: key, ...defaults });
  };

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await runBacktest({
        ticker,
        start_date: startDate,
        end_date: endDate,
        starting_cash: startingCash,
        commission,
        strategy,
        advanced_filters: filters,
        data_source: 'synthetic',
        synthetic_config: syntheticConfig,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(to right, #12E5CD, #12BAE6)' }}>
        <img src="/XL logo transparent.png" alt="ThesisLab" className="w-8 h-8" />
        <h1 className="text-xl font-bold text-white tracking-tight">ThesisLab</h1>
      </header>

      <main className="p-6">
        {/* ── Step 1: Strategy & Market ── */}
        <section className="mb-6">
          <h2 className="section-title">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(var(--accent))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">1</span>
            Strategy
          </h2>
          <div className="card">
            {/* Row 1: Symbol, Start Date, End Date, Cash, Commission */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="w-24">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Symbol</label>
                <input className="input-field !text-lg !font-bold !tracking-widest !text-center" value={ticker}
                  placeholder="SPY"
                  onChange={(e) => setTicker(e.target.value.toUpperCase())} />
              </div>
              <div className="w-40">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Start Date</label>
                <input type="date" className="input-field" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="w-40">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">End Date</label>
                <input type="date" className="input-field" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="w-32">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Starting Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" className="input-field !pl-7" value={startingCash}
                    onChange={(e) => setStartingCash(Number(e.target.value))} />
                </div>
              </div>
              <div className="w-24">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Commission</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" className="input-field !pl-7" step="0.05" min="0" value={commission}
                    onChange={(e) => setCommission(Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] mb-5" />

            {/* Row 2: Single-leg options */}
            <div style={{ marginBottom: '2.5rem' }}>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-3">Select a Leg</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
                {SINGLE_LEG.map((s) => (
                  <StrategyCard key={s.key} name={s.name} tag={s.tag}
                    selected={strategy.type === s.key}
                    onClick={() => handleStrategyChange(s.key)} />
                ))}
              </div>
            </div>

            {/* Row 3: Multi-leg strategies */}
            <div className="mb-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-3">...or Choose a Strategy</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {STRATEGIES.map((s) => (
                  <StrategyCard key={s.key} name={s.name} tag={s.tag}
                    selected={strategy.type === s.key}
                    onClick={() => handleStrategyChange(s.key)} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Step 2: Strategy Parameters (adapts to selection) ── */}
        <section className="mb-6">
          <h2 className="section-title">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(var(--accent))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">2</span>
            Entry & Exit Rules
          </h2>
          <StrategyPanel strategy={strategy} onChange={setStrategy} />
        </section>

        {/* ── Step 3: Advanced (collapsible) ── */}
        <section className="mb-6">
          <button
            onClick={() => setAdvancedOpen((o) => !o)}
            className="section-title flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.08] text-[10px] font-bold text-gray-400">3</span>
            <span className={`text-xs transition-transform ${advancedOpen ? 'rotate-90' : ''}`}>&#9654;</span>
            Advanced Filters
          </button>
          {advancedOpen && (
            <div className="card mt-2">
              <AdvancedSettings filters={filters} onChange={setFilters} />
            </div>
          )}
        </section>

        {/* ── Run ── */}
        <div className="mb-8 flex justify-center">
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="w-1/3 py-4 rounded-lg font-bold text-base bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[hsl(var(--primary-foreground))] transition-all"
          >
            {isLoading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[hsl(var(--danger)/0.1)] border border-[hsl(var(--danger)/0.3)] rounded-lg p-4 mb-6">
            <p className="text-[hsl(var(--danger))] text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <section>
            <h2 className="section-title">Results</h2>

            <div className="flex gap-6">
              {/* Left column: Charts + Trade Log */}
              <div className="flex-1 min-w-0">
                {/* Equity Curve */}
                <div className="card mb-6">
                  <h3 className="card-title">Equity Curve</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Your portfolio's total value over time, including cash and open positions.
                    A rising curve means the strategy is growing capital; dips represent drawdowns.
                  </p>
                  <EquityChart data={result.equity_curve} />
                </div>

                {/* Price + Indicators + RSI */}
                {result.indicators.length > 0 && (
                  <div className="card mb-6">
                    <h3 className="card-title">Price & Indicators</h3>
                    <p className="text-xs text-gray-400 mb-3">
                      Underlying price with optional technical indicator overlays.
                    </p>
                    <PriceChart data={result.indicators} />
                  </div>
                )}

                {/* Trade Log */}
                <div className="card mb-6">
                  <h3 className="card-title">Trade Log</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Each completed trade with entry/exit dates, P&L, and outcome.
                  </p>
                  <TradeLog trades={result.trades} />
                </div>

                {/* Open Positions */}
                {result.open_positions_count > 0 && (
                  <div className="card">
                    <h3 className="card-title">Open Positions: {result.open_positions_count}</h3>
                  </div>
                )}
              </div>

              {/* Right column: Metrics */}
              <div className="w-64 shrink-0 space-y-3">
                <MetricCard label="Total Return" value={formatPct(result.total_return_pct)}
                  positive={result.total_return_pct >= 0} />
                <MetricCard label="Total P&L" value={formatCurrency(result.total_pnl)}
                  positive={result.total_pnl >= 0} />
                <MetricCard label="Win Rate" value={`${result.win_rate.toFixed(1)}%`}
                  positive={result.win_rate >= 50} />
                <MetricCard label="Total Trades" value={`${result.total_trades}`} />
                <MetricCard label="Max Drawdown" value={`${result.max_drawdown_pct.toFixed(2)}%`}
                  positive={false} />
                <MetricCard label="Sharpe Ratio" value={result.sharpe_ratio.toFixed(2)}
                  positive={result.sharpe_ratio >= 0} />
                <MetricCard label="Annualized Return" value={formatPct(result.annualized_return)}
                  positive={result.annualized_return >= 0} />
                <MetricCard label="Avg P&L/Trade" value={formatCurrency(result.avg_pnl_per_trade)}
                  positive={result.avg_pnl_per_trade >= 0} />
                <MetricCard label="Avg Holding Days" value={result.avg_holding_days.toFixed(1)} />
                <MetricCard label="Profit Factor" value={
                  result.profit_factor >= 9999 ? '∞' : result.profit_factor.toFixed(2)
                } positive={result.profit_factor >= 1} />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
