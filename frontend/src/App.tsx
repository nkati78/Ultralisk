import { useState } from 'react';
import { StrategyPanel } from './components/StrategyPanel';
import { AdvancedSettings } from './components/AdvancedSettings';
import { MetricCard } from './components/MetricCard';
import { EquityChart } from './components/EquityChart';
import { PriceChart } from './components/PriceChart';
import { TradeLog } from './components/TradeLog';
import { InfoTip } from './components/InfoTip';
import { runBacktest } from './lib/api';
import { formatCurrency, formatPct } from './lib/utils';
import type {
  StrategyConfig, AdvancedFilters, SyntheticDataConfig, BacktestResponse,
} from './types/api';

const STRATEGIES = [
  { key: 'short_put_spread', name: 'Short Put Vertical Spread' },
  { key: 'short_call_spread', name: 'Short Call Vertical Spread' },
  { key: 'covered_call', name: 'Covered Call' },
  { key: 'protective_put', name: 'Protective Put' },
  { key: 'iron_condor', name: 'Iron Condor' },
  { key: 'straddle', name: 'Long Straddle' },
];

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
  const [syntheticConfig, setSyntheticConfig] = useState<SyntheticDataConfig>({
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
        {/* Setup */}
        <section className="mb-8">
          <h2 className="section-title">Setup</h2>
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              {/* Group 1: Strategy, Ticker, Starting Price */}
              <div className="space-y-3">
                <div>
                  <label className="label">Strategy<InfoTip text="The options strategy to backtest. Each strategy has different risk/reward characteristics." /></label>
                  <select
                    className="input-field"
                    value={strategy.type}
                    onChange={(e) => setStrategy({ ...strategy, type: e.target.value })}
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Ticker<InfoTip text="The stock or ETF symbol (e.g. AAPL, SPY, QQQ)." /></label>
                  <input className="input-field" value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="label">Starting Price ($)<InfoTip text="Synthetic data: underlying price on day one." /></label>
                  <input type="number" className="input-field" value={syntheticConfig.start_price}
                    onChange={(e) => setSyntheticConfig({ ...syntheticConfig, start_price: Number(e.target.value) })} />
                </div>
              </div>

              {/* Group 2: Starting Cash, Commission */}
              <div className="space-y-3">
                <div>
                  <label className="label">Starting Cash ($)<InfoTip text="Total capital available at the start of the backtest." /></label>
                  <input type="number" className="input-field" value={startingCash}
                    onChange={(e) => setStartingCash(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Commission ($)<InfoTip text="Broker fee per options contract. Applied to opens and closes." /></label>
                  <input type="number" className="input-field" step="0.05" value={commission}
                    onChange={(e) => setCommission(Number(e.target.value))} />
                </div>
              </div>

              {/* Group 3: Start Date, End Date */}
              <div className="space-y-3">
                <div>
                  <label className="label">Start Date<InfoTip text="The first trading date to include in the backtest." /></label>
                  <input type="date" className="input-field" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">End Date<InfoTip text="The last trading date to include in the backtest." /></label>
                  <input type="date" className="input-field" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* Group 4: Daily Drift, Base IV, Seed */}
              <div className="space-y-3">
                <div>
                  <label className="label">Daily Drift<InfoTip text="Synthetic data: expected daily return. Typical: -0.001 to 0.001." /></label>
                  <input type="number" className="input-field" step="0.0001" value={syntheticConfig.daily_drift}
                    onChange={(e) => setSyntheticConfig({ ...syntheticConfig, daily_drift: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Base IV<InfoTip text="Synthetic data: implied volatility for pricing options. Typical: 0.15 to 0.50." /></label>
                  <input type="number" className="input-field" step="0.01" value={syntheticConfig.base_iv}
                    onChange={(e) => setSyntheticConfig({ ...syntheticConfig, base_iv: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Seed<InfoTip text="Synthetic data: random seed for reproducibility." /></label>
                  <input type="number" className="input-field" value={syntheticConfig.seed}
                    onChange={(e) => setSyntheticConfig({ ...syntheticConfig, seed: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Entry & Exit Criteria */}
        <section className="mb-8">
          <h2 className="section-title">Entry & Exit Criteria</h2>
          <StrategyPanel strategy={strategy} onChange={setStrategy} />
        </section>

        {/* Advanced Settings */}
        <section className="mb-8">
          <button
            onClick={() => setAdvancedOpen((o) => !o)}
            className="section-title flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className={`transition-transform ${advancedOpen ? 'rotate-90' : ''}`}>&#9654;</span>
            Advanced Settings
          </button>
          {advancedOpen && (
            <div className="card">
              <AdvancedSettings filters={filters} onChange={setFilters} />
            </div>
          )}
        </section>

        {/* Run Button */}
        <div className="mb-8 flex justify-center" style={{ marginTop: '32px' }}>
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
