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
  { key: 'debit_call_spread', name: 'Debit Call Spread', tag: 'Bullish' },
  { key: 'debit_put_spread', name: 'Debit Put Spread', tag: 'Bearish' },
  { key: 'short_put_spread', name: 'Credit Put Spread', tag: 'Bullish' },
  { key: 'short_call_spread', name: 'Credit Call Spread', tag: 'Bearish' },
  { key: 'iron_condor', name: 'Short Iron Condor', tag: 'Neutral' },
  { key: 'long_iron_condor', name: 'Long Iron Condor', tag: 'Directional' },
  { key: 'straddle', name: 'Long Straddle', tag: 'Directional' },
  { key: 'short_straddle', name: 'Short Straddle', tag: 'Neutral' },
  { key: 'long_strangle', name: 'Long Strangle', tag: 'Directional' },
  { key: 'short_strangle', name: 'Short Strangle', tag: 'Neutral' },
];

/* Sensible defaults per strategy type */
const STRATEGY_DEFAULTS: Record<string, Partial<StrategyConfig>> = {
  long_call: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  long_put: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  short_call: { min_dte: 25, max_dte: 45, short_delta: 0.25, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  short_put: { min_dte: 25, max_dte: 45, short_delta: 0.25, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  short_put_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  short_call_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  debit_call_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  debit_put_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  iron_condor: { min_dte: 30, max_dte: 45, short_delta: 0.15, wing_width: 5, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  long_iron_condor: { min_dte: 30, max_dte: 45, short_delta: 0.15, wing_width: 5, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  straddle: { min_dte: 20, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  short_straddle: { min_dte: 20, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
  long_strangle: { min_dte: 25, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  short_strangle: { min_dte: 25, max_dte: 45, short_delta: 0.15, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
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
      style={{ minWidth: '11rem', minHeight: '4.25rem' }}
      className={`relative flex flex-col items-center justify-center gap-0.5 px-7 py-4 rounded-md border transition-all text-center ${
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
      <span className={`text-xs font-medium ${TAG_COLORS[tag] ?? 'text-gray-500'}`}>
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
    time_of_day: { enabled: false, entry_start: '09:30', entry_end: '16:00', exit_start: '09:30', exit_end: '16:00' },
    rsi: { enabled: false, rsi_min: 20, rsi_max: 80, rsi_zone: 'any' },
    bollinger: { enabled: false, position: 'any', use_pct_b: false, pct_b_min: 0, pct_b_max: 0.2 },
    moving_average: { enabled: false, sma_20: 'ignore', sma_50: 'ignore', sma_200: 'ignore', ema_9: 'ignore', ema_21: 'ignore', sma_cross: 'ignore' },
    vwap: { enabled: false, direction: 'above' },
  });

  const [section3Open, setSection3Open] = useState(true);
  const [section4Open, setSection4Open] = useState(false);

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
  const [hasSelectedStrategy, setHasSelectedStrategy] = useState(false);

  const handleStrategyChange = (key: string) => {
    if (strategy.type === key) {
      setStrategy({ ...strategy, type: '' });
      setHasSelectedStrategy(false);
    } else {
      const defaults = STRATEGY_DEFAULTS[key] ?? {};
      setStrategy({ ...strategy, type: key, ...defaults });
      setHasSelectedStrategy(true);
    }
  };

  /* ── Summary chip helpers ── */
  const strategySummary = (): string[] => {
    const chips: string[] = [];
    chips.push(`${strategy.min_dte}–${strategy.max_dte} DTE`);
    if (strategy.type !== 'straddle' && strategy.type !== 'short_straddle' && strategy.type !== 'protective_put') {
      chips.push(`${strategy.short_delta.toFixed(2)}Δ`);
    }
    if (strategy.type === 'protective_put') {
      chips.push(`${strategy.put_delta.toFixed(2)}Δ put`);
    }
    chips.push(`${(strategy.close_at_profit_pct * 100).toFixed(0)}% TP`);
    const isCredit = ['short_put', 'short_call', 'short_put_spread', 'short_call_spread', 'iron_condor', 'short_straddle', 'short_strangle'].includes(strategy.type);
    chips.push(isCredit ? `${strategy.close_at_loss_pct.toFixed(1)}x SL` : `${(strategy.close_at_loss_pct * 100).toFixed(0)}% SL`);
    chips.push(`Close @ ${strategy.close_at_dte}d`);
    return chips;
  };

  const filterSummary = (): string[] => {
    const chips: string[] = [];
    if (filters.time_of_day.enabled) chips.push(`${filters.time_of_day.entry_start}–${filters.time_of_day.entry_end}`);
    if (filters.rsi.enabled) chips.push(`RSI ${filters.rsi.rsi_min}–${filters.rsi.rsi_max}`);
    if (filters.bollinger.enabled) chips.push(`BB: ${filters.bollinger.position.replace('_', ' ')}`);
    if (filters.moving_average.enabled) {
      const active = [
        filters.moving_average.sma_20 !== 'ignore' && `SMA20 ${filters.moving_average.sma_20}`,
        filters.moving_average.sma_50 !== 'ignore' && `SMA50 ${filters.moving_average.sma_50}`,
        filters.moving_average.sma_200 !== 'ignore' && `SMA200 ${filters.moving_average.sma_200}`,
      ].filter(Boolean);
      if (active.length) chips.push(active.join(', '));
      else chips.push('MA enabled');
    }
    if (filters.vwap.enabled) chips.push(`VWAP ${filters.vwap.direction}`);
    return chips;
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

      <main className="p-6" style={{ paddingTop: '1.5rem' }}>
        {/* ── Step 1: Backtest Details ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(var(--accent))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">1</span>
            Backtest Details
          </h2>
          <div className="card">
            <div className="flex flex-wrap items-end gap-4">
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
          </div>
        </section>

        {/* ── Step 2: Strategy ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${hasSelectedStrategy ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))]' : 'bg-white/[0.08] text-gray-400'}`}>2</span>
            Strategy
          </h2>
          <div className="card">
            {/* Single-leg options */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 className="text-lg font-bold text-white mb-3 text-center">Select a Leg</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {SINGLE_LEG.map((s) => (
                  <StrategyCard key={s.key} name={s.name} tag={s.tag}
                    selected={strategy.type === s.key}
                    onClick={() => handleStrategyChange(s.key)} />
                ))}
              </div>
            </div>

            {/* Multi-leg strategies */}
            <div className="mb-2">
              <h3 className="text-lg font-bold text-white mb-3 text-center">...or Choose a Strategy</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {STRATEGIES.map((s) => (
                  <StrategyCard key={s.key} name={s.name} tag={s.tag}
                    selected={strategy.type === s.key}
                    onClick={() => handleStrategyChange(s.key)} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Step 3: Entry & Exit Rules (collapsible) ── */}
        <section style={{ marginBottom: '1.5rem' }} className={hasSelectedStrategy ? '' : 'opacity-50'}>
          {hasSelectedStrategy ? (
            <button
              onClick={() => setSection3Open((o) => !o)}
              className="section-title flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(var(--accent))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">3</span>
              <span className="text-xs transition-transform" style={{ transform: section3Open ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
              Entry & Exit Rules
            </button>
          ) : (
            <h2 className="section-title">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.08] text-[10px] font-bold text-gray-400">3</span>
              Entry & Exit Rules
            </h2>
          )}
          {hasSelectedStrategy && section3Open && (
            <StrategyPanel strategy={strategy} onChange={setStrategy} />
          )}
        </section>

        {/* ── Step 4: Advanced Filters (collapsible) ── */}
        <section style={{ marginBottom: '1.5rem' }} className={hasSelectedStrategy ? '' : 'opacity-50'}>
          {hasSelectedStrategy ? (
            <button
              onClick={() => setSection4Open((o) => !o)}
              className="section-title flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${filterSummary().length > 0 ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))]' : 'bg-white/[0.08] text-gray-400'}`}>4</span>
              <span className="text-xs transition-transform" style={{ transform: section4Open ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
              Advanced Filters
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af', marginLeft: '4px' }}>Optional</span>
            </button>
          ) : (
            <h2 className="section-title">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.08] text-[10px] font-bold text-gray-400">4</span>
              Advanced Filters
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af', marginLeft: '4px' }}>Optional</span>
            </h2>
          )}
          {hasSelectedStrategy && section4Open && (
            <AdvancedSettings filters={filters} onChange={setFilters} />
          )}
        </section>

        {/* ── Summary chips + Run ── */}
        {hasSelectedStrategy && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Strategy Rules</span>
                  <div className="flex flex-wrap gap-2">
                    {strategySummary().map((chip) => (
                      <span key={chip} style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 500 }}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                {filterSummary().length > 0 && (
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--accent))', display: 'block', marginBottom: '6px' }}>Active Filters</span>
                    <div className="flex flex-wrap gap-2">
                      {filterSummary().map((chip) => (
                        <span key={chip} style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '9999px', backgroundColor: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.25)', fontWeight: 500 }}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleRun}
                disabled={isLoading}
                className="w-1/3 py-4 rounded-lg font-bold text-base bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[hsl(var(--primary-foreground))] transition-all"
              >
                {isLoading ? 'Running Backtest...' : 'Run Backtest'}
              </button>
            </div>
          </div>
        )}
        {!hasSelectedStrategy && (
          <div className="mb-8 flex justify-center">
            <button
              disabled
              className="w-1/3 py-4 rounded-lg font-bold text-base opacity-50 cursor-not-allowed bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))]"
            >
              Run Backtest
            </button>
          </div>
        )}

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
