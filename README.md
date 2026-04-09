# Ultralisk

Options trading backtesting tool. Test different options strategies against historical data.

## Strategies

| Strategy | Description |
|---|---|
| `covered_call` | Sell OTM calls against underlying holdings |
| `protective_put` | Buy OTM puts as portfolio insurance |
| `iron_condor` | Sell OTM put spread + call spread (range-bound) |
| `straddle` | Buy ATM call + put (long volatility) |
| `vertical_spread` | Credit put spread (bull) or credit call spread (bear) |

## Usage

```bash
python -m ultralisk.cli \
  --ticker AAPL \
  --start 2023-01-01 \
  --end 2024-01-01 \
  --data data/aapl_options.csv \
  --strategy covered_call \
  --cash 100000
```

Multiple strategies:
```bash
python -m ultralisk.cli \
  --ticker SPY \
  --start 2023-01-01 \
  --end 2024-01-01 \
  --data data/spy_options.csv \
  --strategy covered_call \
  --strategy iron_condor
```

## Data Format

CSV with columns:
```
underlying, quote_date, expiration, strike, option_type, bid, ask,
last, volume, open_interest, implied_volatility, delta, gamma, theta,
vega, underlying_price
```

- Dates: `YYYY-MM-DD`
- `option_type`: `call` or `put`

## Install

```bash
pip install -e .
cd frontend && npm install
```

## Run

```bash
# Terminal 1: API
py -m uvicorn server.main:app --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

Then open http://localhost:5173

## Demo (no data needed)

```bash
py scripts/demo.py
```
