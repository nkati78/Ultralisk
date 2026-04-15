import { useState, useRef } from 'react';
import type { StrategyConfig } from '../types/api';
import { InfoTip } from './InfoTip';

interface Props {
  strategy: StrategyConfig;
  onChange: (s: StrategyConfig) => void;
  exitEnabled: boolean;
  onExitToggle: (v: boolean) => void;
}

/* ── Presets per strategy "family" ── */
type Preset = { label: string; description: string; color: string; activeColor: string; values: Partial<StrategyConfig> };

function getPresets(type: string): Preset[] {
  const isCredit = ['short_put', 'short_call', 'short_put_spread', 'short_call_spread', 'iron_condor', 'short_straddle', 'short_strangle'].includes(type);
  const isDebit = ['long_call', 'long_put', 'debit_call_spread', 'debit_put_spread', 'long_iron_condor', 'straddle', 'long_strangle'].includes(type);

  if (isCredit) {
    return [
      {
        label: 'Conservative',
        description: 'High win rate, smaller premium',
        color: 'text-green-400',
        activeColor: 'border-green-400 bg-green-400/[0.08] shadow-green-400/[0.15]',
        values: { min_dte: 30, max_dte: 60, short_delta: 0.10, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 10, spread_width: 5, wing_width: 5 },
      },
      {
        label: 'Balanced',
        description: 'Moderate risk/reward tradeoff',
        color: 'text-yellow-400',
        activeColor: 'border-yellow-400 bg-yellow-400/[0.08] shadow-yellow-400/[0.15]',
        values: { min_dte: 25, max_dte: 45, short_delta: 0.20, close_at_profit_pct: 0.5, close_at_loss_pct: 2.0, close_at_dte: 7, spread_width: 5, wing_width: 5 },
      },
      {
        label: 'Aggressive',
        description: 'Higher premium, lower win rate',
        color: 'text-red-400',
        activeColor: 'border-red-400 bg-red-400/[0.08] shadow-red-400/[0.15]',
        values: { min_dte: 14, max_dte: 30, short_delta: 0.35, close_at_profit_pct: 0.75, close_at_loss_pct: 1.5, close_at_dte: 3, spread_width: 10, wing_width: 10 },
      },
    ];
  }
  if (isDebit) {
    return [
      {
        label: 'Conservative',
        description: 'More time, tighter stops',
        color: 'text-green-400',
        activeColor: 'border-green-400 bg-green-400/[0.08] shadow-green-400/[0.15]',
        values: { min_dte: 45, max_dte: 90, short_delta: 0.40, close_at_profit_pct: 0.5, close_at_loss_pct: 0.3, close_at_dte: 14, spread_width: 5, wing_width: 5 },
      },
      {
        label: 'Balanced',
        description: 'Moderate expiry and targets',
        color: 'text-yellow-400',
        activeColor: 'border-yellow-400 bg-yellow-400/[0.08] shadow-yellow-400/[0.15]',
        values: { min_dte: 30, max_dte: 60, short_delta: 0.30, close_at_profit_pct: 0.5, close_at_loss_pct: 0.5, close_at_dte: 7, spread_width: 5, wing_width: 5 },
      },
      {
        label: 'Aggressive',
        description: 'Short-dated, ride winners',
        color: 'text-red-400',
        activeColor: 'border-red-400 bg-red-400/[0.08] shadow-red-400/[0.15]',
        values: { min_dte: 14, max_dte: 30, short_delta: 0.20, close_at_profit_pct: 1.0, close_at_loss_pct: 0.75, close_at_dte: 3, spread_width: 10, wing_width: 10 },
      },
    ];
  }
  return [];
}

function matchesPreset(strategy: StrategyConfig, preset: Preset): boolean {
  return Object.entries(preset.values).every(
    ([k, v]) => strategy[k as keyof StrategyConfig] === v
  );
}

/* ── Editable value display ── */
function EditableValue({ value, onChange, format, min, max, step }: {
  value: number; onChange: (v: number) => void;
  format?: (v: number) => string; min: number; max: number; step: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleStart = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const handleCommit = () => {
    const n = Number(draft);
    if (!isNaN(n)) {
      onChange(Math.min(max, Math.max(min, n)));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        className="w-16 bg-transparent border border-[hsl(var(--accent))] rounded px-1 py-0 text-sm font-mono text-white text-right outline-none"
        value={draft}
        min={min} max={max} step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }

  return (
    <span
      onClick={handleStart}
      className="text-sm font-mono text-white cursor-pointer hover:text-[hsl(var(--accent))] transition-colors border-b border-dashed border-white/20 hover:border-[hsl(var(--accent))]"
      title="Click to edit"
    >
      {format ? format(value) : value}
    </span>
  );
}

/* ── Custom slider with snap points ── */
function SnapSlider({ value, min, max, step, snaps, snapLabels, onChange }: {
  value: number; min: number; max: number; step: number;
  snaps: number[]; snapLabels?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const valuePct = pct(value);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const raw = min + x * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, snapped)));
  };

  const handleDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const raw = min + x * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.min(max, Math.max(min, snapped)));
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="relative" style={{ paddingTop: '20px', paddingBottom: '4px' }}>
      {/* Snap labels above track */}
      {snaps.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`absolute cursor-pointer transition-colors ${
            s === value ? 'font-semibold' : ''
          }`}
          style={{
            left: `${pct(s)}%`,
            transform: 'translateX(-50%)',
            top: 0,
            fontSize: '10px',
            color: s === value ? 'hsl(var(--accent))' : '#9ca3af',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          {snapLabels ? snapLabels(s) : s}
        </button>
      ))}

      {/* Track background */}
      <div
        ref={trackRef}
        className="relative cursor-pointer"
        style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)' }}
        onClick={handleTrackClick}
      >
        {/* Filled portion */}
        <div
          className="absolute left-0 top-0"
          style={{ height: '100%', borderRadius: '2px', backgroundColor: 'hsl(var(--accent))', width: `${valuePct}%` }}
        />

        {/* Snap point dots */}
        {snaps.map((s) => {
          const active = s <= value;
          return (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s); }}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${pct(s)}%`,
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: active ? 'hsl(var(--accent))' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          );
        })}

        {/* Draggable thumb */}
        <div
          className="cursor-grab active:cursor-grabbing"
          style={{
            position: 'absolute',
            top: '50%',
            left: `${valuePct}%`,
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'hsl(var(--accent))',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
          onMouseDown={handleDrag}
        />
      </div>
    </div>
  );
}

/* ── Slider with snap points and editable value ── */
function Slider({ label, value, min, max, step, help, tip, onChange, format, snaps, snapLabels }: {
  label: string; value: number; min: number; max: number; step: number;
  help?: string; tip?: string; onChange: (v: number) => void; format?: (v: number) => string;
  snaps?: number[]; snapLabels?: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm" style={{ color: '#d1d5db' }}>
          {label}{tip && <InfoTip text={tip} />}
        </label>
        <EditableValue value={value} onChange={onChange} format={format} min={min} max={max} step={step} />
      </div>
      {snaps ? (
        <SnapSlider value={value} min={min} max={max} step={step} snaps={snaps} snapLabels={snapLabels} onChange={onChange} />
      ) : (
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-500" />
      )}
      {help && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{help}</p>}
    </div>
  );
}

export function StrategyPanel({ strategy, onChange, exitEnabled, onExitToggle }: Props) {
  const set = (patch: Partial<StrategyConfig>) => onChange({ ...strategy, ...patch });
  const type = strategy.type;
  const presets = getPresets(type);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const isSpread = type === 'short_put_spread' || type === 'short_call_spread' || type === 'debit_call_spread' || type === 'debit_put_spread';
  const isIronCondor = type === 'iron_condor' || type === 'long_iron_condor';
  const isProtPut = type === 'protective_put';
  const isStraddle = type === 'straddle' || type === 'short_straddle';

  const applyPreset = (preset: Preset) => {
    if (activePreset === preset.label) {
      setActivePreset(null);
    } else {
      onChange({ ...strategy, ...preset.values });
      setActivePreset(preset.label);
    }
  };

  return (
    <div>
      {/* Preset cards */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center" style={{ marginBottom: '1.5rem' }}>
          {presets.map((p) => {
            const active = activePreset === p.label;
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                style={{ minWidth: '11rem', minHeight: '4.25rem' }}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-7 py-4 rounded-md border transition-all text-center ${
                  active
                    ? `${p.activeColor} shadow-lg`
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" style={{ color: 'inherit' }} />
                )}
                <span className={`text-sm font-semibold ${active ? p.color : 'text-white'}`}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Entry Criteria */}
        <div className="card">
          <h3 className="card-title">Entry Criteria<InfoTip text="Conditions that must be met before a new position is opened." /></h3>
          <Slider label="Min DTE" value={strategy.min_dte} min={1} max={90} step={1}
            snaps={[7, 14, 21, 30, 45, 60, 90]}
            snapLabels={(v) => `${v}d`}
            tip="Minimum days to expiration. Options expiring sooner than this are ignored."
            onChange={(v) => set({ min_dte: v })} />
          <Slider label="Max DTE" value={strategy.max_dte} min={1} max={120} step={1}
            snaps={[14, 30, 45, 60, 90, 120]}
            snapLabels={(v) => `${v}d`}
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
              snaps={[-0.40, -0.30, -0.20, -0.10]}
              format={(v) => v.toFixed(2)}
              tip="Target delta for the protective put. More negative = closer to ATM (more expensive but more protection)."
              onChange={(v) => set({ put_delta: v })} />
          ) : !isStraddle ? (
            <Slider label="Short Delta" value={strategy.short_delta}
              min={0.05} max={0.5} step={0.01}
              snaps={[0.10, 0.16, 0.20, 0.25, 0.30, 0.40]}
              format={(v) => v.toFixed(2)}
              snapLabels={(v) => `.${(v * 100).toFixed(0).padStart(2, '0')}`}
              tip="Delta of the short option leg. Lower values are more OTM with higher probability of profit but smaller premium."
              onChange={(v) => set({ short_delta: v })} />
          ) : null}
          {(isSpread) && (
            <>
              <Slider label="Spread Width ($)" value={strategy.spread_width}
                min={1} max={50} step={1}
                snaps={[1, 2, 5, 10, 15, 20, 50]}
                format={(v) => `$${v}`}
                snapLabels={(v) => `$${v}`}
                tip="Dollar distance between short and long strikes. Wider spreads collect more premium but increase max loss."
                onChange={(v) => set({ spread_width: v })} />
              <Slider label="Max Positions" value={strategy.max_positions}
                min={1} max={20} step={1}
                snaps={[1, 2, 3, 5, 10]}
                tip="Maximum number of simultaneous open positions for this strategy."
                onChange={(v) => set({ max_positions: v })} />
            </>
          )}
          {isIronCondor && (
            <Slider label="Wing Width ($)" value={strategy.wing_width}
              min={1} max={50} step={1}
              snaps={[1, 2, 5, 10, 15, 20, 50]}
              format={(v) => `$${v}`}
              snapLabels={(v) => `$${v}`}
              tip="Dollar distance between short and long wings on each side. Wider wings increase max loss but collect more premium."
              onChange={(v) => set({ wing_width: v })} />
          )}
        </div>

        {/* Exit Criteria */}
        <div className="card" style={{ borderColor: exitEnabled ? 'hsl(var(--accent) / 0.3)' : undefined, backgroundColor: exitEnabled ? 'hsl(var(--accent) / 0.03)' : undefined }}>
          <label className="flex items-center gap-2 cursor-pointer" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={exitEnabled} onChange={(e) => onExitToggle(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-500" />
            <span className="card-title" style={{ marginBottom: 0, color: exitEnabled ? 'white' : '#9ca3af' }}>Exit Criteria</span>
            <InfoTip text="Rules that trigger closing an open position before expiration. Disable to hold positions until expiration." />
          </label>
          <div style={{ opacity: exitEnabled ? 1 : 0.4, pointerEvents: exitEnabled ? 'auto' : 'none' }}>
            <Slider label="Take Profit" value={strategy.close_at_profit_pct}
              min={0.1} max={2.0} step={0.05}
              snaps={[0.25, 0.50, 0.75, 1.0]}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              snapLabels={(v) => `${(v * 100).toFixed(0)}%`}
              tip="Close the position when this percentage of max profit is reached. E.g. 50% means close when half the credit is captured."
              onChange={(v) => set({ close_at_profit_pct: v })} />
            {!isStraddle && !isProtPut && (
              <Slider label="Stop Loss (x credit)" value={strategy.close_at_loss_pct}
                min={0.5} max={5.0} step={0.25}
                snaps={[1.0, 1.5, 2.0, 3.0, 4.0]}
                format={(v) => `${v.toFixed(2)}x`}
                snapLabels={(v) => `${v}x`}
                tip="Close the position when the cost to close exceeds this multiple of the initial credit received."
                onChange={(v) => set({ close_at_loss_pct: v })} />
            )}
            {(isStraddle || isProtPut) && (
              <Slider label="Stop Loss" value={strategy.close_at_loss_pct}
                min={0.1} max={1.0} step={0.05}
                snaps={[0.25, 0.50, 0.75, 1.0]}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                snapLabels={(v) => `${(v * 100).toFixed(0)}%`}
                tip="Close the position when the loss reaches this percentage of the initial debit paid."
                onChange={(v) => set({ close_at_loss_pct: v })} />
            )}
            <Slider label="Close at DTE" value={strategy.close_at_dte}
              min={0} max={30} step={1}
              snaps={[0, 3, 7, 14, 21]}
              snapLabels={(v) => `${v}d`}
              tip="Automatically close the position when this many days remain until expiration, regardless of P&L."
              onChange={(v) => set({ close_at_dte: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}
