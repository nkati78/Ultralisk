import type { TradeResult } from '../types/api';
import { formatCurrency } from '../lib/utils';

interface Props {
  trades: TradeResult[];
}

export function TradeLog({ trades }: Props) {
  if (trades.length === 0) {
    return <p className="text-[hsl(var(--muted-foreground))] text-sm">No closed trades.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))]">
            <th className="th">#</th>
            <th className="th">Strategy</th>
            <th className="th">Entry</th>
            <th className="th">Exit</th>
            <th className="th">Strikes</th>
            <th className="th text-right">Entry Premium</th>
            <th className="th text-right">Exit Premium</th>
            <th className="th text-right">P&L</th>
            <th className="th text-right">Days</th>
            <th className="th">Result</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.number} className="border-b border-[hsl(var(--border))] hover:bg-white/[0.02]">
              <td className="td font-mono">{t.number}</td>
              <td className="td">{t.strategy}</td>
              <td className="td font-mono">{t.entry_date}</td>
              <td className="td font-mono">{t.exit_date}</td>
              <td className="td font-mono text-xs">{t.strikes}</td>
              <td className="td text-right font-mono">{formatCurrency(t.entry_premium)}</td>
              <td className="td text-right font-mono">{formatCurrency(t.exit_premium)}</td>
              <td className={`td text-right font-mono font-semibold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(t.pnl)}
              </td>
              <td className="td text-right font-mono">{t.days_held}</td>
              <td className="td">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  t.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {t.result}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
