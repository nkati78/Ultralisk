interface Props {
  label: string;
  value: string;
  positive?: boolean;
}

export function MetricCard({ label, value, positive }: Props) {
  const colorClass = positive === undefined
    ? 'text-white'
    : positive
      ? 'text-[hsl(var(--accent))]'
      : 'text-[hsl(var(--danger))]';

  const accentBorder = positive === undefined
    ? 'border-l-[hsl(var(--border))]'
    : positive
      ? 'border-l-[hsl(var(--accent))]'
      : 'border-l-[hsl(var(--danger))]';

  return (
    <div className={`card border-l-2 ${accentBorder}`}>
      <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
      <p className={`text-lg font-semibold font-mono ${colorClass}`}>{value}</p>
    </div>
  );
}
