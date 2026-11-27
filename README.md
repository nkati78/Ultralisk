# Ultralisk

Event-driven trade engine and framework for quant/algo trading.

## Architecture

```
src/ultralisk/
  core/        Event types and the engine event loop
  data/        Data feed interface (market data sources)
  pipeline/    Daily orchestrator, stages, and the current strategy
  backtest/    Simulated broker + backtest runner
  execution/   Live broker/exchange adapter interface
```

The engine runs on a single event queue. A `DataFeed` emits `MarketEvent`s,
each registered `Strategy` turns those into `SignalEvent`s, a `Broker`
(simulated for backtesting, or a live adapter) turns signals into
`OrderEvent`s and reports back `FillEvent`s.

## Development

```
pip install -e ".[dev]"
pytest
```
