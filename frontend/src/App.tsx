import { useState } from 'react';
import { StrategyPanel } from './components/StrategyPanel';
import { AdvancedSettings } from './components/AdvancedSettings';
import { MetricCard } from './components/MetricCard';
import { EquityChart } from './components/EquityChart';
import { PriceChart } from './components/PriceChart';
import { RSIChart } from './components/RSIChart';
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
    time_of_day: { enabled: false, entry_start: '09:30', entry_end: '16:00', exit_start: '09:30', exit_end: '16:00' },
    rsi: { enabled: false, rsi_min: 20, rsi_max: 80, rsi_zone: 'any' },
    bollinger: { enabled: false, position: 'any', use_pct_b: false, pct_b_min: 0, pct_b_max: 0.2 },
    moving_average: { enabled: false, sma_20: 'ignore', sma_50: 'ignore', sma_200: 'ignore', ema_9: 'ignore', ema_21: 'ignore', sma_cross: 'ignore' },
    vwap: { enabled: false, direction: 'above' },
  });
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
      <header className="border-b border-[hsl(var(--border))] px-6 py-4">
        <h1 className="text-xl font-bold text-white tracking-tight">Ultralisk</h1>
      </header>

      <main className="p-6">
        {/* Setup Row */}
        <section className="mb-8">
          <h2 className="section-title">Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Strategy */}
            <div className="card">
              <h3 className="card-title">Strategy<InfoTip text="The options strategy to backtest. Each strategy has different risk/reward characteristics." /></h3>
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

            {/* Ticker & Timeframe */}
            <div className="card">
              <h3 className="card-title">Ticker & Timeframe<InfoTip text="The underlying symbol and date range for the backtest simulation." /></h3>
              <label className="label">Ticker<InfoTip text="The stock or ETF symbol to run the backtest against (e.g. AAPL, SPY, QQQ)." /></label>
              <input
                className="input-field"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="label">Start<InfoTip text="The first trading date to include in the backtest." /></label>
                  <input type="date" className="input-field" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">End<InfoTip text="The last trading date to include in the backtest." /></label>
                  <input type="date" className="input-field" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Capital */}
            <div className="card">
              <h3 className="card-title">Capital<InfoTip text="Initial portfolio funding and per-contract trading costs." /></h3>
              <label className="label">Starting Cash ($)<InfoTip text="The total amount of capital available at the start of the backtest." /></label>
              <input type="number" className="input-field" value={startingCash}
                onChange={(e) => setStartingCash(Number(e.target.value))} />
              <label className="label mt-2">Commission/Contract ($)<InfoTip text="The broker fee charged per options contract traded. Applied to both opening and closing trades." /></label>
              <input type="number" className="input-field" step="0.05" value={commission}
                onChange={(e) => setCommission(Number(e.target.value))} />
            </div>

            {/* Synthetic Data */}
            <div className="card">
              <h3 className="card-title">Synthetic Data<InfoTip text="Configure the simulated market data generator. Useful for testing without real historical data." /></h3>
              <label className="label">Start Price ($)<InfoTip text="The underlying asset's price on the first day of the simulation." /></label>
              <input type="number" className="input-field" value={syntheticConfig.start_price}
                onChange={(e) => setSyntheticConfig({ ...syntheticConfig, start_price: Number(e.target.value) })} />
              <label className="label mt-2">Daily Drift<InfoTip text="Expected daily price return. Positive = upward bias, negative = downward. Typical range: -0.001 to 0.001." /></label>
              <input type="number" className="input-field" step="0.0001" value={syntheticConfig.daily_drift}
                onChange={(e) => setSyntheticConfig({ ...syntheticConfig, daily_drift: Number(e.target.value) })} />
              <label className="label mt-2">Base IV<InfoTip text="Base implied volatility for synthetic options. Higher = wider premiums. Typical range: 0.15 to 0.50." /></label>
              <input type="number" className="input-field" step="0.01" value={syntheticConfig.base_iv}
                onChange={(e) => setSyntheticConfig({ ...syntheticConfig, base_iv: Number(e.target.value) })} />
              <label className="label mt-2">Seed<InfoTip text="Random seed for reproducibility. Same seed + same settings = identical results every time." /></label>
              <input type="number" className="input-field" value={syntheticConfig.seed}
                onChange={(e) => setSyntheticConfig({ ...syntheticConfig, seed: Number(e.target.value) })} />
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
          <h2 className="section-title">Advanced Settings</h2>
          <div className="card">
            <AdvancedSettings filters={filters} onChange={setFilters} />
          </div>
        </section>

        {/* Run Button */}
        <div className="mb-8">
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="w-full md:w-auto px-12 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            {isLoading ? 'Running...' : 'Run Backtest'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <section>
            <h2 className="section-title">Results</h2>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Annualized Return" value={formatPct(result.annualized_return)}
                positive={result.annualized_return >= 0} />
              <MetricCard label="Avg P&L/Trade" value={formatCurrency(result.avg_pnl_per_trade)}
                positive={result.avg_pnl_per_trade >= 0} />
              <MetricCard label="Avg Holding Days" value={result.avg_holding_days.toFixed(1)} />
              <MetricCard label="Profit Factor" value={
                result.profit_factor >= 9999 ? '∞' : result.profit_factor.toFixed(2)
              } positive={result.profit_factor >= 1} />
            </div>

            {/* Equity Curve */}
            <div className="card mb-6">
              <h3 className="card-title">Equity Curve</h3>
              <p className="text-xs text-gray-400 mb-3">
                Your portfolio's total value over time, including cash and open positions.
                A rising curve means the strategy is growing capital; dips represent drawdowns.
              </p>
              <EquityChart data={result.equity_curve} />
            </div>

            {/* Price + Indicators */}
            {result.indicators.length > 0 && (
              <div className="card mb-6">
                <h3 className="card-title">Price & Indicators</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Underlying price with optional technical indicator overlays.
                </p>
                <PriceChart data={result.indicators} />
              </div>
            )}

            {/* RSI */}
            {result.indicators.some((d) => d.rsi_14 !== null) && (
              <div className="card mb-6">
                <h3 className="card-title">RSI (14-period)</h3>
                <p className="text-xs text-gray-400 mb-1">
                  Relative Strength Index measures momentum on a 0-100 scale.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                  <span><span className="inline-block w-3 h-0.5 bg-purple-400 mr-1 align-middle" />RSI</span>
                  <span><span className="inline-block w-3 h-0.5 bg-red-400/50 mr-1 align-middle" style={{ borderTop: '1px dashed' }} />Overbought (70)</span>
                  <span><span className="inline-block w-3 h-0.5 bg-green-400/50 mr-1 align-middle" style={{ borderTop: '1px dashed' }} />Oversold (30)</span>
                </div>
                <RSIChart data={result.indicators} />
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
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
