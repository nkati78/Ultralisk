---
name: run-backtest
description: Run an options backtest using the Ultralisk backtesting engine. Use when the user asks to backtest a strategy, test options trades, or run a simulation.
---

When the user asks to run a backtest:

1. Ask for any missing parameters:
   - **Strategy**: covered_call, protective_put, iron_condor, straddle, short_put_spread, short_call_spread
   - **Ticker**: symbol (default: TEST with synthetic data)
   - **Timeframe**: start and end dates
   - **Key parameters**: DTE range, delta target, spread width, profit/loss targets

2. Build and run the backtest using the FakeDataProvider (synthetic data) or CsvDataProvider (real data):

```python
from datetime import date
from ultralisk.data.fake_provider import FakeDataProvider
from ultralisk.engine.backtester import Backtester, BacktestConfig
from ultralisk.analytics.report import print_summary

# Available strategies:
from ultralisk.strategies.covered_call import CoveredCall
from ultralisk.strategies.protective_put import ProtectivePut
from ultralisk.strategies.iron_condor import IronCondor
from ultralisk.strategies.straddle import Straddle
from ultralisk.strategies.vertical_spread import VerticalSpread, SpreadDirection
```

3. Show the results summary using `print_summary(result)` or reference key metrics:
   - `result.total_return_pct`, `result.win_rate`, `result.sharpe_ratio`
   - `result.max_drawdown_pct`, `result.profit_factor`, `result.total_trades`

4. The Streamlit UI is also available: `py -m streamlit run app.py`
