import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { StrategyPanel } from './components/StrategyPanel';
import { AdvancedSettings } from './components/AdvancedSettings';
import { MetricCard } from './components/MetricCard';
import { EquityChart } from './components/EquityChart';
import { PriceChart } from './components/PriceChart';
import { RSIChart } from './components/RSIChart';
import { TradeLog } from './components/TradeLog';
import { runBacktest } from './lib/api';
import { formatCurrency, formatPct } from './lib/utils';
import type {
  StrategyConfig, AdvancedFilters, SyntheticDataConfig, BacktestResponse,
} from './types/api';

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
    <div className="flex min-h-screen">
      <Sidebar
        strategy={strategy} onStrategyChange={setStrategy}
        ticker={ticker} onTickerChange={setTicker}
        startDate={startDate} onStartDateChange={setStartDate}
        endDate={endDate} onEndDateChange={setEndDate}
        startingCash={startingCash} onStartingCashChange={setStartingCash}
        commission={commission} onCommissionChange={setCommission}
        syntheticConfig={syntheticConfig} onSyntheticConfigChange={setSyntheticConfig}
        onRunBacktest={handleRun} isLoading={isLoading}
      />

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Strategy Config */}
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
