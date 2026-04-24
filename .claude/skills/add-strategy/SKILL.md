---
name: add-strategy
description: Add a new options trading strategy to the ThesisLab backtesting engine. Use when the user wants to create or implement a new strategy.
---

When adding a new strategy, update these files in order:

## 1. Backend: Strategy class

Create a new file in `thesislab/strategies/` following the Strategy protocol:

```python
from dataclasses import dataclass
from thesislab.domain import Leg, OptionType, OptionsChain, Position, Trade

@dataclass
class MyStrategy:
    name: str = "MyStrategy"
    # ... parameters with defaults ...

    def scan(self, chain: OptionsChain, current_positions: list[Position]) -> list[Trade]:
        """Return trades to open. Empty list = do nothing today."""
        ...

    def should_close(self, position: Position, chain: OptionsChain) -> Trade | None:
        """Return closing Trade or None to hold."""
        ...
```

Key conventions:
- `Leg.quantity`: positive = long, negative = short
- `Trade.net_premium`: positive = credit, negative = debit
- Use `chain.filter()` to find contracts by type, DTE, strike, delta
- Use `contract.mid` for mid-price, `contract.dte(date)` for days to expiration

## 2. Backend: Register in `thesislab/strategies/__init__.py`

Import the class and add to `STRATEGY_REGISTRY`.

## 3. Backend: Wire up in `server/main.py`

Add a case in `_build_strategy()` mapping the strategy key to the class constructor. Follow the existing pattern — pass `cfg.min_dte`, `cfg.max_dte`, `cfg.close_at_profit_pct`, etc.

## 4. Frontend: Register the strategy in `frontend/src/App.tsx`

Three places to update:

- **`SINGLE_LEG` or `STRATEGY_GROUPS`** — Add the strategy card with `key`, `name`, and `tag` (Bullish/Bearish/Neutral/Directional)
- **`getStrategyDefaults()`** — Add sensible default parameters for the strategy key
- **`CREDIT_STRATEGIES`** — Add the key if it's a credit strategy (affects stop loss display and trade estimates)

## 5. Frontend: Update `StrategyPanel.tsx` if needed

If the strategy needs special slider behavior (e.g., no delta slider for straddles, put delta for protective puts), update the conditional logic in `StrategyPanel`.

## 6. Frontend: Update types if needed

If the strategy requires new fields in `StrategyConfig`, add them to:
- `frontend/src/types/api.ts` — `StrategyConfig` interface
- `server/schemas.py` — `StrategyConfig` Pydantic model

## 7. Verify

- `python -m py_compile server/main.py` — backend compiles
- `cd frontend && npx tsc --noEmit` — frontend compiles
- Test the strategy via the UI end-to-end
