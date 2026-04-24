---
name: review-frontend
description: Review the React frontend for UI consistency, alignment, and code quality. Use when the user wants to check the frontend code or fix visual issues.
---

When reviewing the frontend (React + TypeScript + Tailwind CSS + Vite):

## Architecture Overview

- **`frontend/src/App.tsx`** — Main application file with all state, step bar navigation, and section layout
- **`frontend/src/components/`** — Reusable chart and UI components
  - `EquityChart.tsx` — Equity curve with S&P 500, buy-and-hold benchmarks, trade markers (lightweight-charts v5)
  - `PriceChart.tsx` — Price & indicators chart with RSI sub-chart, overlays, trade markers
  - `StrategyPanel.tsx` — Entry/exit criteria sliders with snap points and editable values
  - `AdvancedSettings.tsx` — RSI, Bollinger, MA, VWAP, time-of-day filter toggles
  - `TradeLog.tsx` — Trade results table
  - `InfoTip.tsx` — Hover tooltip component
  - `MetricCard.tsx` — (unused, can be removed)
- **`frontend/src/types/api.ts`** — TypeScript interfaces matching backend Pydantic models
- **`frontend/src/lib/utils.ts`** — Shared utilities (formatCurrency, etc.)

## Layout & Navigation

1. **Step bar**: Sticky horizontal nav with steps 1-4 (setup) and 5 (results). Steps 1-4 render together on one scrollable page. Step 5 swaps to a separate results view. Clicking steps 1-4 scrolls to that section via refs.

2. **Section headings**: Each section (1-4) has a numbered circle using `hsl(var(--accent))` teal when active, `rgba(255,255,255,0.06)` when inactive.

3. **Sticky bottom bar**: Shows strategy summary + trade estimates + Run button on setup view. Hides summary details on results view, keeping the button right-aligned.

4. **Loading state**: Full-screen centered progress bar with `activeSection = 'setup'` and `isLoading = true`.

## Chart Conventions (lightweight-charts v5)

- Use `createChart()`, `chart.addSeries(LineSeries, ...)`, `createSeriesMarkers()` — NOT v4 API
- Always set `handleScale: { mouseWheel: false }` to prevent scroll hijacking
- Tooltip overlays use `subscribeCrosshairMove` with absolute-positioned divs
- Color conventions:
  - Strategy/equity: `#1DE9B6` (teal accent)
  - S&P 500 benchmark: `#f59e0b` (amber, dashed)
  - Buy & Hold / ticker: `#8b5cf6` (purple, dashed)
  - Wins: `#10b981` / Losses: `#f87171`

## Styling Conventions

- Dark theme: background `hsl(220 14% 10%)`, cards use `.card` class
- Accent color: `hsl(var(--accent))` — teal green
- Font: Inter for UI, monospace for numbers/values
- Inline styles for dynamic values, Tailwind classes for static layout
- Toggle buttons: accent-tinted bg when active, `bg-white/[0.03]` when inactive

## Code Quality Checks

1. **Type safety**: Run `npx tsc --noEmit` after changes — must compile clean
2. **Strategy parity**: Every strategy key in `STRATEGY_GROUPS` / `SINGLE_LEG` must have:
   - A matching case in `server/main.py` `_build_strategy()`
   - Defaults in `getStrategyDefaults()` in App.tsx
   - Correct credit/debit classification in `CREDIT_STRATEGIES`
3. **Unused imports**: Remove any imports no longer referenced
4. **Props consistency**: Chart components accept `data, trades, sp500, buyHold, ticker, startingCash`
