import type { StrategyConfig } from '../types/api';

interface Props {
  strategy: StrategyConfig;
  onChange: (s: StrategyConfig) => void;
}

function Slider({ label, value, min, max, step, help, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  help?: string; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-[hsl(var(--muted-foreground))]">{label}</label>
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
        <h3 className="card-title">Entry Criteria</h3>
        <Slider label="Min DTE" value={strategy.min_dte} min={1} max={90} step={1}
          onChange={(v) => set({ min_dte: v })} />
        <Slider label="Max DTE" value={strategy.max_dte} min={1} max={120} step={1}
          onChange={(v) => set({ max_dte: v })} />
        {strategy.min_dte > strategy.max_dte && (
          <p className="text-yellow-400 text-xs">Min DTE should be less than Max DTE</p>
        )}
      </div>

      {/* Delta & Spread */}
      <div className="card">
        <h3 className="card-title">
          {isSpread || isIronCondor ? 'Delta & Spread' : isProtPut ? 'Delta' : 'Delta'}
        </h3>
        {isProtPut ? (
          <Slider label="Put Delta Target" value={strategy.put_delta}
            min={-0.5} max={-0.05} step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set({ put_delta: v })} />
        ) : !isStraddle ? (
          <Slider label="Short Delta" value={strategy.short_delta}
            min={0.05} max={0.5} step={0.01}
            format={(v) => v.toFixed(2)}
            help="Lower = more OTM / higher probability"
            onChange={(v) => set({ short_delta: v })} />
        ) : null}
        {(isSpread) && (
          <>
            <Slider label="Spread Width ($)" value={strategy.spread_width}
              min={1} max={50} step={1} format={(v) => `$${v}`}
              onChange={(v) => set({ spread_width: v })} />
            <Slider label="Max Positions" value={strategy.max_positions}
              min={1} max={20} step={1}
              onChange={(v) => set({ max_positions: v })} />
          </>
        )}
        {isIronCondor && (
          <Slider label="Wing Width ($)" value={strategy.wing_width}
            min={1} max={50} step={1} format={(v) => `$${v}`}
            onChange={(v) => set({ wing_width: v })} />
        )}
      </div>

      {/* Exit Criteria */}
      <div className="card">
        <h3 className="card-title">Exit Criteria</h3>
        <Slider label="Take Profit" value={strategy.close_at_profit_pct}
          min={0.1} max={2.0} step={0.05}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => set({ close_at_profit_pct: v })} />
        {!isStraddle && !isProtPut && (
          <Slider label="Stop Loss (x credit)" value={strategy.close_at_loss_pct}
            min={0.5} max={5.0} step={0.25}
            format={(v) => `${v.toFixed(2)}x`}
            onChange={(v) => set({ close_at_loss_pct: v })} />
        )}
        {(isStraddle || isProtPut) && (
          <Slider label="Stop Loss" value={strategy.close_at_loss_pct}
            min={0.1} max={1.0} step={0.05}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={(v) => set({ close_at_loss_pct: v })} />
        )}
        <Slider label="Close at DTE" value={strategy.close_at_dte}
          min={0} max={30} step={1}
          onChange={(v) => set({ close_at_dte: v })} />
      </div>
    </div>
  );
}
