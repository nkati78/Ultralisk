import type { StrategyConfig, AdvancedFilters } from '../types/api';

export interface SavedBacktest {
  id: string;
  name: string;
  savedAt: string;
  ticker: string;
  startDate: string;
  endDate: string;
  startingCash: number;
  commission: number;
  strategy: StrategyConfig;
  filters: AdvancedFilters;
  // Summary from results
  totalReturn: number;
  totalTrades: number;
  winRate: number;
  sharpe: number;
}

export interface DefaultSettings {
  ticker: string;
  startDate: string;
  endDate: string;
  startingCash: number;
  commission: number;
  strategy: string;
}

const SAVED_KEY = 'thesislab_saved_backtests';
const DEFAULTS_KEY = 'thesislab_default_settings';

export function getSavedBacktests(): SavedBacktest[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveBacktest(bt: SavedBacktest) {
  const all = getSavedBacktests();
  all.unshift(bt);
  localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}

export function deleteBacktest(id: string) {
  const all = getSavedBacktests().filter((b) => b.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}

export function getDefaultSettings(): DefaultSettings | null {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveDefaultSettings(s: DefaultSettings) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(s));
}

export function clearDefaultSettings() {
  localStorage.removeItem(DEFAULTS_KEY);
}
