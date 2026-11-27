# Ultralisk

Event-driven trade engine and framework for quant/algo trading. Python 3.11+, no runtime dependencies yet.

Vision, target architecture, engineering standards, and research discipline: @docs/VISION.md

## Commands

```
pip install -e ".[dev]"   # install with dev deps
pytest                    # run tests (testpaths = tests/)
```

## Architecture

**The daily pipeline is the core.** The event engine is for simulation/backtesting only.

### Daily pipeline (`src/ultralisk/pipeline/`)

- `orchestrator.py` — `Stage` (name, fn, dependencies) + `Orchestrator`, which orders stages with `graphlib.TopologicalSorter`.
- `state.py` — `PipelineState`: mutable bag each stage fills in for one as-of date.
- `daily.py` — `build_daily_pipeline(provider)` wires the stages from docs/VISION.md: universe → symbology → market_data → (risk_model ‖ data_lake → signal_lake) → combined_signal → audit → rebalance → post_trade.
- `data/dummy.py` — `DummyDataProvider`: deterministic, point-in-time synthetic universe/symbology/prices (includes a delisted and a late-listed security). Stand-in for real vendors.

### Event engine (simulation)

Single event queue in `src/ultralisk/core/engine.py`. Flow:

```
DataFeed -> MarketEvent -> Strategy -> SignalEvent -> Broker -> OrderEvent -> Broker -> FillEvent
```

- `core/events.py` — frozen dataclasses for each event type; `Event` is their union.
- `core/engine.py` — `Engine` drains the queue, dispatching by `isinstance`. Defines `Protocol`s for `DataFeed`, `Strategy`, `Broker` (structural typing).
- `data/feed.py` — `DataFeed` ABC + `ListDataFeed` (in-memory, for tests/backtests).
- `strategy/base.py` — `Strategy` ABC.
- `backtest/broker.py` — `SimulatedBroker`: immediate fills, no slippage/fees.
- `execution/broker.py` — `LiveBroker` ABC for real exchange adapters.

## Conventions

- `src/` layout; import as `ultralisk.<module>`.
- Events are immutable — create new events, never mutate.
- Handlers return `list[Event]` (empty list for no-op) rather than pushing to the queue directly.
- Type hints everywhere, using modern syntax (`list[X]`, `X | Y`).
- New components implement the ABC in their package; the engine only depends on the `Protocol`s.

## Known gaps

- `SimulatedBroker` sets `fill_price=0.0` — `SignalEvent`/`OrderEvent` carry no price, so the broker has no reference price yet.
- `Engine` takes a single strategy; multi-strategy is not supported yet.
- No portfolio/position tracking or risk layer yet.
- Pipeline: data is dummy and in-memory (no real lakes/storage); risk model is per-security volatility only (no covariance); rebalance is signal/vol scaled to gross 1 plus a no-trade band, not an optimizer (no λ, no cost model, no position limits); stages run sequentially; rebalance output isn't wired into the event engine.

## Git workflow

This overrides the global "don't commit unless asked" rule for this repo.

When a task is complete and `pytest` passes, commit and push to `main` (`git push origin main`) without asking. Write commit messages that explain the why. If tests fail, don't commit — report the failure instead.

## Claude model

Use **Claude Opus 5.5** (`claude-opus-5-5`) for work in this repo, and as the default model for any Claude API integration added to the project (e.g. via the `anthropic` Python SDK). Use the exact ID — no date suffix. Don't switch to another model unless explicitly asked.
