---
name: run-backtest
description: Run an options backtest using the ThesisLab backtesting engine. Use when the user asks to backtest a strategy, test options trades, or run a simulation.
---

When the user asks to run a backtest:

## Via the UI (preferred)

1. Ensure both servers are running:
   - Backend: `python -m uvicorn server.main:app --reload --port 8000`
   - Frontend: `cd frontend && npm run dev` (serves at http://localhost:5173)

2. The UI handles all configuration through the step bar:
   - **Step 1 (Details)**: Ticker, date range, starting cash, commission
   - **Step 2 (Strategy)**: Select from single legs or multi-leg strategies
   - **Step 3 (Entry & Exit)**: DTE range, delta, spread width, take profit, stop loss
   - **Step 4 (Advanced)**: RSI, Bollinger, MA, VWAP, time-of-day filters (optional)
   - Click **Run Backtest** in the sticky bottom bar

3. Results appear in **Step 5** with:
   - Performance stats (return, Sharpe, win rate, drawdown, etc.)
   - Equity Curve chart (with S&P 500 and buy-and-hold benchmarks)
   - Price & Indicators chart (with toggleable overlays)
   - Trade log table

## Via Python (scripting/testing)

```python
from datetime import date
from thesislab.data.fake_provider import FakeDataProvider
from thesislab.engine.backtester import Backtester, BacktestConfig

# Available strategies:
from thesislab.strategies.vertical_spread import VerticalSpread, SpreadDirection
from thesislab.strategies.iron_condor import IronCondor
from thesislab.strategies.straddle import Straddle
from thesislab.strategies.short_straddle import ShortStraddle
from thesislab.strategies.strangle import Strangle
from thesislab.strategies.butterfly import Butterfly, ButterflyType
from thesislab.strategies.calendar_spread import CalendarSpread, CalendarType
from thesislab.strategies.single_leg import SingleLeg, LegDirection
from thesislab.strategies.debit_spread import DebitSpread, DebitDirection
from thesislab.strategies.covered_call import CoveredCall
from thesislab.strategies.protective_put import ProtectivePut

provider = FakeDataProvider(ticker="AAPL", start_price=450)
config = BacktestConfig(
    ticker="AAPL",
    start_date=date(2023, 1, 3),
    end_date=date(2024, 1, 3),
    starting_cash=100_000,
)
strategy = VerticalSpread(
    name="ShortPutSpread", direction=SpreadDirection.BULL,
    short_delta=0.25, spread_width=5,
    min_dte=25, max_dte=45,
    close_at_profit_pct=0.5, close_at_loss_pct=2.0, close_at_dte=7,
)
backtester = Backtester(config=config, provider=provider, strategies=[strategy])
result = backtester.run()
```

Key result attributes:
- `result.total_return_pct`, `result.win_rate`, `result.sharpe_ratio`
- `result.max_drawdown_pct`, `result.profit_factor`, `result.total_trades`
- `result.equity_curve` — dict of date → equity value
- `result.closed_positions` — list of completed trades
- `result.indicator_history` — dict of date → indicator snapshot

## Via API (direct)

```bash
curl -X POST http://localhost:8000/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","start_date":"2023-01-03","end_date":"2024-01-03","starting_cash":100000,"commission":0.65,"strategy":{"type":"short_put_spread","min_dte":25,"max_dte":45,"short_delta":0.25,"spread_width":5},"data_source":"synthetic","synthetic_config":{"start_price":450,"daily_drift":0.0003,"base_iv":0.25,"seed":42}}'
```

The API returns a `BacktestResponse` with equity curve, trades, indicators, S&P 500 benchmark, and buy-and-hold benchmark.
