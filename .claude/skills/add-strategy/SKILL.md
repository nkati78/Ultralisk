---
name: add-strategy
description: Add a new options trading strategy to the ThesisLab backtesting engine. Use when the user wants to create or implement a new strategy.
---

When adding a new strategy:

1. Create a new file in `thesislab/strategies/` following the Strategy protocol:

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

2. Register it in `thesislab/strategies/__init__.py`:
   - Import the class
   - Add to `STRATEGY_REGISTRY`

3. Add a configuration panel in `app.py` for the Streamlit frontend

Key conventions:
- `Leg.quantity`: positive = long, negative = short
- `Trade.net_premium`: positive = credit, negative = debit
- Use `chain.filter()` to find contracts by type, DTE, strike, delta
- Use `contract.mid` for mid-price, `contract.dte(date)` for days to expiration
