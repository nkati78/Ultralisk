import type { StrategyConfig } from '../types/api';
import { InfoTip } from './InfoTip';

interface Props {
  strategy: StrategyConfig;
  onChange: (s: StrategyConfig) => void;
}

function Slider({ label, value, min, max, step, help, tip, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  help?: string; tip?: string; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-[hsl(var(--muted-foreground))]">
          {label}{tip && <InfoTip text={tip} />}
        </label>
        <span className="text-sm font-mono text-white">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500" />
      {help && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{help}</p>}
    </div>
  );
}

export function StrategyPanel({ strategy, onChange }: Props) {
  const set = (patch: Partial<StrategyConfig>) => onChange({ ...strategy, ...patch });
  const type = strategy.type;

  const isSpread = type === 'short_put_spread' || type === 'short_call_spread';
  const isIronCondor = type === 'iron_condor';
  const isProtPut = type === 'protective_put';
  const isStraddle = type === 'straddle';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Entry Criteria */}
      <div className="card">
        <h3 className="card-title">Entry Criteria<InfoTip text="Conditions that must be met before a new position is opened." /></h3>
        <Slider label="Min DTE" value={strategy.min_dte} min={1} max={90} step={1}
          tip="Minimum days to expiration. Options expiring sooner than this are ignored."
          onChange={(v) => set({ min_dte: v })} />
        <Slider label="Max DTE" value={strategy.max_dte} min={1} max={120} step={1}
          tip="Maximum days to expiration. Options expiring later than this are ignored."
          onChange={(v) => set({ max_dte: v })} />
        {strategy.min_dte > strategy.max_dte && (
          <p className="text-yellow-400 text-xs">Min DTE should be less than Max DTE</p>
        )}
      </div>

      {/* Delta & Spread */}
      <div className="card">
        <h3 className="card-title">
          {isSpread || isIronCondor ? <>Delta & Spread<InfoTip text="Controls how far out-of-the-money the options are and the width between strike prices." /></> : <>Delta<InfoTip text="Controls how far out-of-the-money the selected options are." /></>}
        </h3>
        {isProtPut ? (
          <Slider label="Put Delta Target" value={strategy.put_delta}
            min={-0.5} max={-0.05} step={0.01}
            format={(v) => v.toFixed(2)}
            tip="Target delta for the protective put. More negative = closer to ATM (more expensive but more protection)."
            onChange={(v) => set({ put_delta: v })} />
        ) : !isStraddle ? (
          <Slider label="Short Delta" value={strategy.short_delta}
            min={0.05} max={0.5} step={0.01}
            format={(v) => v.toFixed(2)}
            tip="Delta of the short option leg. Lower values are more OTM with higher probability of profit but smaller premium."
            onChange={(v) => set({ short_delta: v })} />
        ) : null}
        {(isSpread) && (
          <>
            <Slider label="Spread Width ($)" value={strategy.spread_width}
              min={1} max={50} step={1} format={(v) => `$${v}`}
              tip="Dollar distance between short and long strikes. Wider spreads collect more premium but increase max loss."
              onChange={(v) => set({ spread_width: v })} />
            <Slider label="Max Positions" value={strategy.max_positions}
              min={1} max={20} step={1}
              tip="Maximum number of simultaneous open positions for this strategy."
              onChange={(v) => set({ max_positions: v })} />
          </>
        )}
        {isIronCondor && (
          <Slider label="Wing Width ($)" value={strategy.wing_width}
            min={1} max={50} step={1} format={(v) => `$${v}`}
            tip="Dollar distance between short and long wings on each side. Wider wings increase max loss but collect more premium."
            onChange={(v) => set({ wing_width: v })} />
        )}
      </div>

      {/* Exit Criteria */}
      <div className="card">
        <h3 className="card-title">Exit Criteria<InfoTip text="Rules that trigger closing an open position before expiration." /></h3>
        <Slider label="Take Profit" value={strategy.close_at_profit_pct}
          min={0.1} max={2.0} step={0.05}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          tip="Close the position when this percentage of max profit is reached. E.g. 50% means close when half the credit is captured."
          onChange={(v) => set({ close_at_profit_pct: v })} />
        {!isStraddle && !isProtPut && (
          <Slider label="Stop Loss (x credit)" value={strategy.close_at_loss_pct}
            min={0.5} max={5.0} step={0.25}
            format={(v) => `${v.toFixed(2)}x`}
            tip="Close the position when the cost to close exceeds this multiple of the initial credit received."
            onChange={(v) => set({ close_at_loss_pct: v })} />
        )}
        {(isStraddle || isProtPut) && (
          <Slider label="Stop Loss" value={strategy.close_at_loss_pct}
            min={0.1} max={1.0} step={0.05}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            tip="Close the position when the loss reaches this percentage of the initial debit paid."
            onChange={(v) => set({ close_at_loss_pct: v })} />
        )}
        <Slider label="Close at DTE" value={strategy.close_at_dte}
          min={0} max={30} step={1}
          tip="Automatically close the position when this many days remain until expiration, regardless of P&L."
          onChange={(v) => set({ close_at_dte: v })} />
      </div>
    </div>
  );
}
