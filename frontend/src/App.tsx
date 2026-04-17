import { useState, useRef, useCallback } from 'react';
import { StrategyPanel } from './components/StrategyPanel';
import { AdvancedSettings } from './components/AdvancedSettings';
import { EquityChart } from './components/EquityChart';
import { PriceChart } from './components/PriceChart';
import { TradeLog } from './components/TradeLog';
import { runBacktest } from './lib/api';
import { formatCurrency, formatPct } from './lib/utils';
import type {
  StrategyConfig, AdvancedFilters, SyntheticDataConfig, BacktestResponse,
} from './types/api';

const SINGLE_LEG = [
  { key: 'long_call', name: 'Long Call', tag: 'Bullish' },
  { key: 'long_put', name: 'Long Put', tag: 'Bearish' },
  { key: 'short_call', name: 'Short Call', tag: 'Bearish' },
  { key: 'short_put', name: 'Short Put', tag: 'Bullish' },
];

const STRATEGY_GROUPS = [
  {
    label: 'Vertical Spreads',
    items: [
      { key: 'debit_call_spread', name: 'Call Debit Spread', tag: 'Bullish' },
      { key: 'debit_put_spread', name: 'Put Debit Spread', tag: 'Bearish' },
      { key: 'short_put_spread', name: 'Put Credit Spread', tag: 'Bullish' },
      { key: 'short_call_spread', name: 'Call Credit Spread', tag: 'Bearish' },
    ],
  },
  {
    label: 'Calendar Spreads',
    items: [
      { key: 'calendar_call_spread', name: 'Calendar Call Spread', tag: 'Neutral' },
      { key: 'calendar_put_spread', name: 'Calendar Put Spread', tag: 'Neutral' },
    ],
  },
  {
    label: 'Iron Condor',
    items: [
      { key: 'iron_condor', name: 'Iron Condor', tag: 'Neutral' },
    ],
  },
  {
    label: 'Straddles',
    items: [
      { key: 'straddle', name: 'Long Straddle', tag: 'Directional' },
      { key: 'short_straddle', name: 'Short Straddle', tag: 'Neutral' },
    ],
  },
  {
    label: 'Strangles',
    items: [
      { key: 'long_strangle', name: 'Long Strangle', tag: 'Directional' },
      { key: 'short_strangle', name: 'Short Strangle', tag: 'Neutral' },
    ],
  },
  {
    label: 'Butterflies',
    items: [
      { key: 'iron_butterfly', name: 'Iron Butterfly', tag: 'Neutral' },
      { key: 'long_call_butterfly', name: 'Long Call Butterfly', tag: 'Neutral' },
      { key: 'long_put_butterfly', name: 'Long Put Butterfly', tag: 'Neutral' },
    ],
  },
];

/* Sensible defaults per strategy type — spread/wing widths scale with underlying price */
function defaultWidth(price: number): number {
  if (price >= 1000) return 50;
  if (price >= 300) return 5;
  return 3;
}

function getStrategyDefaults(key: string, price: number): Partial<StrategyConfig> {
  const w = defaultWidth(price);
  const base: Record<string, Partial<StrategyConfig>> = {
    long_call: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    long_put: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    short_call: { min_dte: 25, max_dte: 45, short_delta: 0.25, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    short_put: { min_dte: 25, max_dte: 45, short_delta: 0.25, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    short_put_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: w, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    short_call_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: w, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    debit_call_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: w, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    debit_put_spread: { min_dte: 25, max_dte: 45, short_delta: 0.25, spread_width: w, max_positions: 1, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    iron_condor: { min_dte: 30, max_dte: 45, short_delta: 0.15, wing_width: w, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    straddle: { min_dte: 20, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    short_straddle: { min_dte: 20, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    long_strangle: { min_dte: 25, max_dte: 45, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    short_strangle: { min_dte: 25, max_dte: 45, short_delta: 0.15, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    iron_butterfly: { min_dte: 30, max_dte: 45, short_delta: 0.50, wing_width: w, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7 },
    long_call_butterfly: { min_dte: 30, max_dte: 60, short_delta: 0.50, wing_width: w, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    long_put_butterfly: { min_dte: 30, max_dte: 60, short_delta: 0.50, wing_width: w, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    calendar_call_spread: { min_dte: 25, max_dte: 45, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
    calendar_put_spread: { min_dte: 25, max_dte: 45, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7 },
  };
  return base[key] ?? {};
}

const CREDIT_STRATEGIES = new Set([
  'short_put', 'short_call', 'short_put_spread', 'short_call_spread',
  'iron_condor', 'iron_butterfly', 'short_straddle', 'short_strangle',
  'calendar_call_spread', 'calendar_put_spread',
]);

interface TradeEstimate {
  creditOrDebit: number;   // positive = credit, negative = debit
  isCredit: boolean;
  marginRequired: number;
  maxGain: number;
  maxLoss: number;
}

function estimateTradeStats(
  type: string, price: number, delta: number,
  spreadW: number, wingW: number,
  minDte: number, maxDte: number, iv: number,
): TradeEstimate | null {
  if (!type) return null;
  const isCredit = CREDIT_STRATEGIES.has(type);
  const T = ((minDte + maxDte) / 2) / 365;
  const sqrtT = Math.sqrt(T);
  const df = delta / 0.50;
  const legPrem = price * 0.4 * iv * sqrtT * df;

  let cd: number, margin: number, gain: number, loss: number;

  if (type === 'short_put_spread' || type === 'short_call_spread') {
    const longDf = Math.max(0.05, delta - spreadW / price) / 0.50;
    const longPrem = price * 0.4 * iv * sqrtT * longDf;
    cd = (legPrem - longPrem) * 100;
    margin = spreadW * 100;
    gain = cd; loss = margin - cd;
  } else if (type === 'debit_call_spread' || type === 'debit_put_spread') {
    const shortDf = Math.max(0.05, delta - spreadW / price) / 0.50;
    const shortPrem = price * 0.4 * iv * sqrtT * shortDf;
    cd = -(legPrem - shortPrem) * 100;
    margin = Math.abs(cd);
    gain = spreadW * 100 - margin; loss = margin;
  } else if (type === 'short_put' || type === 'short_call') {
    cd = legPrem * 100;
    margin = price * 20; gain = cd; loss = Infinity;
  } else if (type === 'long_call' || type === 'long_put') {
    cd = -(legPrem * 100);
    margin = Math.abs(cd); gain = Infinity; loss = margin;
  } else if (type === 'iron_condor') {
    const wingDf = Math.max(0.05, delta - wingW / price) / 0.50;
    const wingPrem = price * 0.4 * iv * sqrtT * wingDf;
    cd = (2 * legPrem - 2 * wingPrem) * 100;
    margin = wingW * 100; gain = cd; loss = margin - cd;
  } else if (type === 'iron_butterfly') {
    const atmPrem = price * 0.4 * iv * sqrtT;
    const wingDf = Math.max(0.05, 0.50 - wingW / price) / 0.50;
    const wingPrem = price * 0.4 * iv * sqrtT * wingDf;
    cd = (2 * atmPrem - 2 * wingPrem) * 100;
    margin = wingW * 100; gain = cd; loss = margin - cd;
  } else if (type === 'short_straddle') {
    const atmPrem = price * 0.4 * iv * sqrtT;
    cd = 2 * atmPrem * 100;
    margin = price * 20; gain = cd; loss = Infinity;
  } else if (type === 'straddle') {
    const atmPrem = price * 0.4 * iv * sqrtT;
    cd = -(2 * atmPrem * 100);
    margin = Math.abs(cd); gain = Infinity; loss = margin;
  } else if (type === 'short_strangle') {
    cd = 2 * legPrem * 100;
    margin = price * 20; gain = cd; loss = Infinity;
  } else if (type === 'long_strangle') {
    cd = -(2 * legPrem * 100);
    margin = Math.abs(cd); gain = Infinity; loss = margin;
  } else if (type === 'long_call_butterfly' || type === 'long_put_butterfly') {
    const atmPrem = price * 0.4 * iv * sqrtT;
    const wingDf = Math.max(0.05, 0.50 - wingW / price) / 0.50;
    const wingPrem = price * 0.4 * iv * sqrtT * wingDf;
    cd = -(2 * wingPrem - 2 * (atmPrem * 0.5)) * 100;
    margin = Math.abs(cd); gain = wingW * 100 - margin; loss = margin;
  } else if (type === 'calendar_call_spread' || type === 'calendar_put_spread') {
    const frontPrem = legPrem * 0.7;
    const backPrem = legPrem * 1.3;
    cd = -(backPrem - frontPrem) * 100;
    margin = Math.abs(cd); gain = margin * 1.5; loss = margin;
  } else {
    return null;
  }
  return { creditOrDebit: cd, isCredit, marginRequired: Math.max(0, margin), maxGain: Math.max(0, gain), maxLoss: Math.max(0, loss) };
}

const ALL_STRATEGIES = [...SINGLE_LEG, ...STRATEGY_GROUPS.flatMap((g) => g.items)];
const STRATEGY_NAME_MAP: Record<string, string> = Object.fromEntries(ALL_STRATEGIES.map((s) => [s.key, s.name]));

const TAG_COLORS: Record<string, string> = {
  Bullish: 'text-green-400',
  Bearish: 'text-red-400',
  Neutral: 'text-yellow-400',
  Directional: 'text-blue-400',
};

function StrategyCard({ name, tag, selected, onClick }: {
  name: string; tag: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ minWidth: '11rem', minHeight: '4.25rem' }}
      className={`relative flex flex-col items-center justify-center gap-0.5 px-7 py-4 rounded-md border transition-all text-center ${
        selected
          ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)] shadow-lg shadow-[hsl(var(--accent)/0.15)]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[hsl(var(--accent))]" />
      )}
      <span className={`text-sm font-semibold ${selected ? 'text-[hsl(var(--accent))]' : 'text-white'}`}>
        {name}
      </span>
      <span className={`text-xs font-medium ${TAG_COLORS[tag] ?? 'text-gray-500'}`}>
        {tag.toLowerCase()}
      </span>
    </button>
  );
}

function App() {
  const [strategy, setStrategy] = useState<StrategyConfig>({
    type: '', min_dte: 25, max_dte: 45, short_delta: 0.25,
    spread_width: 5, max_positions: 1, close_at_profit_pct: 0.5,
    close_at_loss_pct: 2.0, close_at_dte: 7, put_delta: -0.2, wing_width: 5,
  });
  const [filters, setFilters] = useState<AdvancedFilters>({
    time_of_day: { enabled: false, entry_start: '09:30', entry_end: '16:00', exit_start: '09:30', exit_end: '16:00' },
    rsi: { enabled: false, rsi_min: 20, rsi_max: 80, rsi_zone: 'any' },
    bollinger: { enabled: false, position: 'any', use_pct_b: false, pct_b_min: 0, pct_b_max: 0.2 },
    moving_average: { enabled: false, sma_20: 'ignore', sma_50: 'ignore', sma_200: 'ignore', ema_9: 'ignore', ema_21: 'ignore', sma_cross: 'ignore' },
    vwap: { enabled: false, direction: 'above' },
  });

  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(true);
  const [section4Open, setSection4Open] = useState(false);
  const [section5Open, setSection5Open] = useState(false);
  const [exitEnabled, setExitEnabled] = useState(false);

  const [syntheticConfig] = useState<SyntheticDataConfig>({
    start_price: 450, daily_drift: 0.0003, base_iv: 0.25, seed: 42,
  });
  const [ticker, setTicker] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-03');
  const [endDate, setEndDate] = useState('2024-01-03');
  const [startingCash, setStartingCash] = useState(100000);
  const [commission, setCommission] = useState(0.65);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasSelectedStrategy, setHasSelectedStrategy] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markStale = useCallback(() => { if (result) setIsStale(true); }, [result]);

  const handleStrategyChange = (key: string) => {
    if (strategy.type === key) {
      setStrategy({ ...strategy, type: '' });
      setHasSelectedStrategy(false);
    } else {
      const defaults = getStrategyDefaults(key, syntheticConfig.start_price);
      setStrategy({ ...strategy, type: key, ...defaults });
      setHasSelectedStrategy(true);
    }
    markStale();
  };

  const handleSetStrategy = (s: StrategyConfig) => { setStrategy(s); markStale(); };
  const handleSetFilters = (f: AdvancedFilters) => { setFilters(f); markStale(); };
  const handleSetExitEnabled = (v: boolean) => { setExitEnabled(v); markStale(); };
  const handleSetTicker = (v: string) => { setTicker(v); markStale(); };
  const handleSetStartDate = (v: string) => { setStartDate(v); markStale(); };
  const handleSetEndDate = (v: string) => { setEndDate(v); markStale(); };
  const handleSetStartingCash = (v: number) => { setStartingCash(v); markStale(); };
  const handleSetCommission = (v: number) => { setCommission(v); markStale(); };

  /* ── Trade estimate ── */
  const tradeEstimate = estimateTradeStats(
    strategy.type, syntheticConfig.start_price, strategy.short_delta,
    strategy.spread_width, strategy.wing_width,
    strategy.min_dte, strategy.max_dte, syntheticConfig.base_iv,
  );

  /* ── Summary chip helpers ── */
  type Chip = { label: string; value: string };

  const strategySummary = (): Chip[] => {
    const chips: Chip[] = [];
    chips.push({ label: 'Strategy', value: STRATEGY_NAME_MAP[strategy.type] ?? strategy.type });
    chips.push({ label: 'Expiry', value: `${strategy.min_dte}–${strategy.max_dte} days` });
    if (strategy.type !== 'straddle' && strategy.type !== 'short_straddle' && strategy.type !== 'protective_put') {
      chips.push({ label: 'Delta', value: strategy.short_delta.toFixed(2) });
    }
    if (strategy.type === 'protective_put') {
      chips.push({ label: 'Put Delta', value: strategy.put_delta.toFixed(2) });
    }
    if (exitEnabled) {
      chips.push({ label: 'Take Profit', value: `${(strategy.close_at_profit_pct * 100).toFixed(0)}%` });
      const isCred = CREDIT_STRATEGIES.has(strategy.type);
      chips.push({ label: 'Stop Loss', value: isCred ? `${strategy.close_at_loss_pct.toFixed(1)}x` : `${(strategy.close_at_loss_pct * 100).toFixed(0)}%` });
      if (strategy.close_at_dte > 0) {
        chips.push({ label: 'Close Before', value: `${strategy.close_at_dte} DTE` });
      }
    } else {
      chips.push({ label: 'Exit', value: 'Hold until expiry' });
    }
    return chips;
  };

  const filterSummary = (): Chip[] => {
    const chips: Chip[] = [];
    if (filters.time_of_day.enabled) chips.push({ label: 'Hours', value: `${filters.time_of_day.entry_start}–${filters.time_of_day.entry_end}` });
    if (filters.rsi.enabled) chips.push({ label: 'RSI', value: `${filters.rsi.rsi_min}–${filters.rsi.rsi_max}` });
    if (filters.bollinger.enabled) chips.push({ label: 'Bollinger', value: filters.bollinger.position.replace(/_/g, ' ') });
    if (filters.moving_average.enabled) {
      const active = [
        filters.moving_average.sma_20 !== 'ignore' && `SMA20 ${filters.moving_average.sma_20}`,
        filters.moving_average.sma_50 !== 'ignore' && `SMA50 ${filters.moving_average.sma_50}`,
        filters.moving_average.sma_200 !== 'ignore' && `SMA200 ${filters.moving_average.sma_200}`,
      ].filter(Boolean);
      chips.push({ label: 'Moving Avg', value: active.length ? active.join(', ') : 'Enabled' });
    }
    if (filters.vwap.enabled) chips.push({ label: 'VWAP', value: `Price ${filters.vwap.direction}` });
    return chips;
  };

  const fmtEst = (v: number) => v === Infinity ? 'Unlimited' : formatCurrency(v);

  const handleRun = async () => {
    // Collapse all setup sections
    setSection1Open(false);
    setSection2Open(false);
    setSection3Open(false);
    setSection4Open(false);
    setIsLoading(true);
    setLoadingProgress(0);
    setError(null);
    setResult(null);
    setIsStale(false);

    // Animate progress bar (decelerating curve, caps at ~92%)
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const target = Math.min(92, 100 * (1 - Math.exp(-elapsed / 1.2)));
      setLoadingProgress(target);
    }, 80);

    try {
      const finalStrategy = exitEnabled
        ? strategy
        : { ...strategy, close_at_profit_pct: 9999, close_at_loss_pct: 9999, close_at_dte: 0 };
      const [res] = await Promise.all([
        runBacktest({
          ticker,
          start_date: startDate,
          end_date: endDate,
          starting_cash: startingCash,
          commission,
          strategy: finalStrategy,
          advanced_filters: filters,
          data_source: 'synthetic',
          synthetic_config: syntheticConfig,
        }),
        new Promise((r) => setTimeout(r, 3000)), // minimum 3s display
      ]);
      if (progressRef.current) clearInterval(progressRef.current);
      setLoadingProgress(100);
      await new Promise((r) => setTimeout(r, 300)); // brief pause at 100%
      setResult(res);
      setSection5Open(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      setIsLoading(false);
    }
  };

  /* ── Collapsible section header helper ── */
  const SectionHeader = ({ num, label, open, onToggle, enabled = true, active, extra }: {
    num: number; label: string; open: boolean; onToggle: () => void; enabled?: boolean; active?: boolean; extra?: React.ReactNode;
  }) => {
    const bubbleActive = active ?? enabled;
    return enabled ? (
      <button
        onClick={onToggle}
        className="section-title flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ backgroundColor: bubbleActive ? 'hsl(var(--accent))' : 'rgba(255,255,255,0.08)', color: bubbleActive ? 'hsl(var(--primary-foreground))' : '#9ca3af' }}>{num}</span>
        <span className="text-xs transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
        {label}
        {extra}
      </button>
    ) : (
      <h2 className="section-title">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.08] text-[10px] font-bold text-gray-400">{num}</span>
        {label}
        {extra}
      </h2>
    );
  };


  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(to right, #12E5CD, #12BAE6)' }}>
        <img src="/XL logo transparent.png" alt="ThesisLab" className="w-8 h-8" />
        <h1 className="text-xl font-bold text-white tracking-tight">ThesisLab</h1>
      </header>

      <main className="p-6" style={{ paddingTop: '1.5rem' }}>
        {/* ── Step 1: Backtest Details (collapsible) ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          <SectionHeader num={1} label="Backtest Details" open={section1Open} onToggle={() => setSection1Open((o) => !o)} />
          {section1Open && (
            <div className="card">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-24">
                  <label className="block mb-1" style={{ fontSize: '14px', color: '#d1d5db' }}>Symbol</label>
                  <input className="input-field !text-lg !font-bold !tracking-widest !text-center" value={ticker}
                    placeholder="SPY"
                    onChange={(e) => handleSetTicker(e.target.value.toUpperCase())} />
                </div>
                <div className="w-40">
                  <label className="block mb-1" style={{ fontSize: '14px', color: '#d1d5db' }}>Start Date</label>
                  <input type="date" className="input-field" value={startDate}
                    onChange={(e) => handleSetStartDate(e.target.value)} />
                </div>
                <div className="w-40">
                  <label className="block mb-1" style={{ fontSize: '14px', color: '#d1d5db' }}>End Date</label>
                  <input type="date" className="input-field" value={endDate}
                    onChange={(e) => handleSetEndDate(e.target.value)} />
                </div>
                <div className="w-32">
                  <label className="block mb-1" style={{ fontSize: '14px', color: '#d1d5db' }}>Starting Cash</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" className="input-field !pl-7" value={startingCash}
                      onChange={(e) => handleSetStartingCash(Number(e.target.value))} />
                  </div>
                </div>
                <div className="w-24">
                  <label className="block mb-1" style={{ fontSize: '14px', color: '#d1d5db' }}>Commission</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" className="input-field !pl-7" step="0.05" min="0" value={commission}
                      onChange={(e) => handleSetCommission(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Step 2: Strategy (collapsible) ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          <SectionHeader num={2} label="Strategy" open={section2Open}
            onToggle={() => setSection2Open((o) => !o)}
            enabled={hasSelectedStrategy || section2Open} />
          {section2Open && (
            <div className="card">
              {/* Single-leg options */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 className="text-lg font-bold text-white text-center" style={{ marginBottom: '1rem' }}>Select a Leg</h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {SINGLE_LEG.map((s) => (
                    <StrategyCard key={s.key} name={s.name} tag={s.tag}
                      selected={strategy.type === s.key}
                      onClick={() => handleStrategyChange(s.key)} />
                  ))}
                </div>
              </div>

              {/* Multi-leg strategies: groups side by side, cards stacked */}
              <div>
                <h3 className="text-lg font-bold text-white text-center" style={{ marginBottom: '1rem' }}>...or Choose a Strategy</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {STRATEGY_GROUPS.map((group, i) => (
                    <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '14rem', paddingLeft: i > 0 ? '1rem' : undefined, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                      <p style={{ fontSize: '14px', color: '#d1d5db', textAlign: 'center', marginBottom: '4px' }}>{group.label}</p>
                      {group.items.map((s) => (
                        <StrategyCard key={s.key} name={s.name} tag={s.tag}
                          selected={strategy.type === s.key}
                          onClick={() => handleStrategyChange(s.key)} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Step 3: Entry & Exit Rules (collapsible) ── */}
        <section style={{ marginBottom: '1.5rem' }} className={hasSelectedStrategy ? '' : 'opacity-50'}>
          <SectionHeader num={3} label="Entry & Exit Rules" open={section3Open}
            onToggle={() => setSection3Open((o) => !o)} enabled={hasSelectedStrategy} />
          {hasSelectedStrategy && section3Open && (
            <StrategyPanel strategy={strategy} onChange={handleSetStrategy} exitEnabled={exitEnabled} onExitToggle={handleSetExitEnabled} underlyingPrice={syntheticConfig.start_price} />
          )}
        </section>

        {/* ── Step 4: Advanced Rules (collapsible) ── */}
        <section style={{ marginBottom: '1.5rem' }} className={hasSelectedStrategy ? '' : 'opacity-50'}>
          <SectionHeader num={4} label="Advanced Rules" open={section4Open}
            onToggle={() => setSection4Open((o) => !o)} enabled={hasSelectedStrategy}
            active={filters.time_of_day.enabled || filters.rsi.enabled || filters.bollinger.enabled || filters.moving_average.enabled || filters.vwap.enabled}
            extra={<span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af', marginLeft: '4px' }}>Optional</span>} />
          {hasSelectedStrategy && section4Open && (
            <AdvancedSettings filters={filters} onChange={handleSetFilters} />
          )}
        </section>

        {/* ── Loading progress ── */}
        {isLoading && (
          <section style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ maxWidth: '540px', margin: '2rem auto', textAlign: 'center', padding: '2rem 2.5rem' }}>
              <p className="text-white text-lg font-semibold" style={{ marginBottom: '1rem' }}>Running backtest...</p>
              <p className="text-sm" style={{ color: '#9ca3af', marginBottom: '1.25rem' }}>
                Simulating {ticker} from {startDate} to {endDate}
              </p>
              {/* Progress bar */}
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  background: 'linear-gradient(90deg, hsl(var(--accent)), #12BAE6)',
                  width: `${loadingProgress}%`,
                  transition: 'width 0.15s ease-out',
                }} />
              </div>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {loadingProgress < 100 ? `${Math.round(loadingProgress)}% complete — est. ${Math.max(1, Math.round(3 - (loadingProgress / 100) * 3))}s remaining` : 'Finalizing...'}
              </p>
            </div>
          </section>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-[hsl(var(--danger)/0.1)] border border-[hsl(var(--danger)/0.3)] rounded-lg p-4 mb-6">
            <p className="text-[hsl(var(--danger))] text-sm">{error}</p>
          </div>
        )}

        {/* ── Step 5: Results (collapsible, inactive until run) ── */}
        <section style={{ marginBottom: '1.5rem' }} className={result && !isLoading ? '' : 'opacity-50'}>
          <SectionHeader num={5} label="Results" open={section5Open}
            onToggle={() => setSection5Open((o) => !o)}
            enabled={!!result && !isLoading}
            active={!!result && !isLoading}
            extra={isStale ? (
              <span style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '9999px', backgroundColor: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontWeight: 500, marginLeft: '8px' }}>
                Settings changed — re-run for updated results
              </span>
            ) : undefined} />
          {result && !isLoading && section5Open && (
            <div>

            {/* Strategy details + Performance stats */}
            <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
              {/* Strategy details row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {strategySummary().map((item) => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{item.label}</p>
                    <p style={{ fontSize: '13px', color: 'white', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{item.value}</p>
                  </div>
                ))}
                {filterSummary().length > 0 && (
                  <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                )}
                {filterSummary().map((item) => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: 'hsl(var(--accent))', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{item.label}</p>
                    <p style={{ fontSize: '13px', color: 'white', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Performance metrics row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {[
                  { label: 'Total Return', value: formatPct(result.total_return_pct), color: result.total_return_pct >= 0 ? '#10b981' : '#f87171' },
                  { label: 'Annual', value: formatPct(result.annualized_return), color: result.annualized_return >= 0 ? '#10b981' : '#f87171' },
                  { label: 'Total P&L', value: formatCurrency(result.total_pnl), color: result.total_pnl >= 0 ? '#10b981' : '#f87171' },
                  { label: 'Avg P&L', value: formatCurrency(result.avg_pnl_per_trade), color: result.avg_pnl_per_trade >= 0 ? '#10b981' : '#f87171' },
                  { label: 'Win Rate', value: `${result.win_rate.toFixed(1)}%`, color: result.win_rate >= 50 ? '#10b981' : '#f87171' },
                  { label: 'Drawdown', value: `${result.max_drawdown_pct.toFixed(2)}%`, color: '#f87171' },
                  { label: 'Trades', value: `${result.total_trades}`, color: 'white' },
                  { label: 'Sharpe', value: result.sharpe_ratio.toFixed(2), color: result.sharpe_ratio >= 0 ? '#10b981' : '#f87171' },
                  { label: 'Profit Factor', value: result.profit_factor >= 9999 ? '∞' : result.profit_factor.toFixed(2), color: result.profit_factor >= 1 ? '#10b981' : '#f87171' },
                  { label: 'Hold Days', value: result.avg_holding_days.toFixed(1), color: 'white' },
                ].map((stat) => (
                  <div key={stat.label} style={{ textAlign: 'center', flex: '1 1 0', minWidth: 0 }}>
                    <p style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{stat.label}</p>
                    <p style={{ fontSize: '14px', color: stat.color, fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts + Trade Log */}
            <div>
              {/* Equity Curve */}
              <div className="card mb-6">
                <h3 className="card-title">Equity Curve</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Your portfolio's total value over time, including cash and open positions.
                  A rising curve means the strategy is growing capital; dips represent drawdowns.
                </p>
                <EquityChart data={result.equity_curve} trades={result.trades} sp500={result.sp500_benchmark} startingCash={startingCash} />
              </div>

              {/* Price + Indicators + RSI */}
              {result.indicators.length > 0 && (
                <div className="card mb-6">
                  <h3 className="card-title">Price & Indicators</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Underlying price with optional technical indicator overlays.
                  </p>
                  <PriceChart data={result.indicators} />
                </div>
              )}

              {/* Trade Log */}
              <div className="card mb-6">
                <h3 className="card-title">Trade Log</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Each completed trade with entry/exit dates, P&L, and outcome.
                </p>
                <TradeLog trades={result.trades} />
              </div>

              {/* Open Positions */}
              {result.open_positions_count > 0 && (
                <div className="card">
                  <h3 className="card-title">Open Positions: {result.open_positions_count}</h3>
                </div>
              )}
            </div>
            </div>
          )}
        </section>

        {/* Spacer for sticky bottom bar */}
        <div style={{ height: hasSelectedStrategy ? '160px' : '90px' }} />
      </main>

      {/* ── Sticky bottom bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'hsl(220 14% 11% / 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 28px',
      }}>
        {hasSelectedStrategy ? (
          <div style={{ margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Strategy setup details */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '1rem', flexWrap: 'nowrap', alignItems: 'flex-end', overflow: 'hidden' }}>
                {strategySummary().map((item) => (
                  <div key={item.label} style={{ textAlign: 'center', flexShrink: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{item.label}</p>
                    <p style={{ fontSize: '15px', color: 'white', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</p>
                  </div>
                ))}
                {filterSummary().map((item) => (
                  <div key={item.label} style={{ textAlign: 'center', flexShrink: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: 'hsl(var(--accent))', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{item.label}</p>
                    <p style={{ fontSize: '15px', color: 'white', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Divider */}
              {tradeEstimate && (
                <div style={{ width: '1px', height: '42px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
              )}
              {/* Per-trade estimates */}
              {tradeEstimate && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'nowrap', alignItems: 'flex-end', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{tradeEstimate.isCredit ? 'Credit' : 'Debit'}</p>
                    <p style={{ fontSize: '15px', color: tradeEstimate.isCredit ? '#10b981' : '#f87171', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{fmtEst(Math.abs(tradeEstimate.creditOrDebit))}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>BPR</p>
                    <p style={{ fontSize: '15px', color: 'white', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{fmtEst(tradeEstimate.marginRequired)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Max Gain</p>
                    <p style={{ fontSize: '15px', color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{fmtEst(tradeEstimate.maxGain)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Max Loss</p>
                    <p style={{ fontSize: '15px', color: '#f87171', fontWeight: 600, fontFamily: 'var(--font-mono, ui-monospace, monospace)', whiteSpace: 'nowrap' }}>{fmtEst(tradeEstimate.maxLoss)}</p>
                  </div>
                </div>
              )}
              {/* Run button + stale warning */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {isStale && (
                  <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 500 }}>Settings changed</span>
                )}
                <button
                  onClick={handleRun}
                  disabled={isLoading}
                  style={{
                    padding: '12px 48px', borderRadius: '8px', fontWeight: 700, fontSize: '15px',
                    backgroundColor: isStale ? '#f59e0b' : 'hsl(var(--accent))',
                    color: isStale ? '#000' : 'hsl(var(--primary-foreground))',
                    border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {isLoading ? 'Running...' : isStale ? 'Re-run Backtest' : 'Run Backtest'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              disabled
              style={{ padding: '10px 40px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--primary-foreground))', border: 'none', cursor: 'not-allowed', opacity: 0.4 }}
            >
              Select a strategy to run
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
