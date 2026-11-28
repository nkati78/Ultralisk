# Ultralisk

Daily quant trading pipeline for cross-sectional factor strategies.

A strategy is `(asset universe, signals, signal combination, objective, constraints)`.
Each day the pipeline builds a point-in-time universe, computes signals, combines them,
and rebalances the portfolio. See [docs/VISION.md](docs/VISION.md) for the target design.

## How a daily run works

```
universe -> symbology -> market_data -> ┬ risk_model
                                        └ data_lake -> signal_lake
         -> combined_signal -> audit -> rebalance -> post_trade
```

| Stage | Does |
|---|---|
| `universe` | Securities tradable on the as-of date (handles listings and delistings) |
| `symbology` | Maps vendor tickers to permanent security IDs |
| `market_data` | Price history per security |
| `risk_model` | Per-security volatility |
| `data_lake` / `signal_lake` | Returns, then signals (20-day momentum, 5-day reversal) |
| `combined_signal` | Averages signal z-scores into one forecast per security |
| `audit` | Stops the run if any data is missing or invalid |
| `rebalance` | Target weights (signal ÷ volatility, 100% gross), skipping trades inside a no-trade band |
| `post_trade` | Exposure, turnover, and position count |

```python
from datetime import date
from ultralisk.data.dummy import DummyDataProvider
from ultralisk.pipeline.state import PipelineState
from ultralisk.pipeline.strategy import build_daily_pipeline

state = build_daily_pipeline(DummyDataProvider()).run(PipelineState(as_of=date(2025, 6, 1)))
print(state.trades, state.report)
```

Data currently comes from `DummyDataProvider`, which generates deterministic synthetic data in place of real vendors.

## Layout

```
src/ultralisk/
  pipeline/    Orchestrator, pipeline state, and the current strategy (strategy.py)
  data/        Data providers (dummy) and the event-engine data feed
  core/        Event types and the event engine (for simulation)
  backtest/    Simulated broker
  execution/   Live broker/exchange adapter interface
```

The event engine (`core/engine.py`) is a separate per-event simulation loop:
`MarketEvent -> SignalEvent -> OrderEvent -> FillEvent`. It is not yet connected to the pipeline.

## Development

```
pip install -e ".[dev]"
pytest
```
