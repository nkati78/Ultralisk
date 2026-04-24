# ThesisLab

Options backtesting platform with a React frontend and FastAPI backend.

## Workflow Rules

- Before making **frontend/UI changes**, invoke `/review-frontend` to review current conventions
- Before **adding a new strategy**, invoke `/add-strategy` to follow the full checklist
- Before **running or testing a backtest**, invoke `/run-backtest` for the correct approach

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite (lightweight-charts v5 for charting)
- **Backend**: FastAPI + uvicorn (`server/main.py`)
- **Engine**: Python backtesting engine in `thesislab/`

## Commands

- Frontend dev server: `cd frontend && npm run dev`
- Backend dev server: `python -m uvicorn server.main:app --reload --port 8000`
- Type check frontend: `cd frontend && npx tsc --noEmit`
- Type check backend: `python -m py_compile server/main.py`
