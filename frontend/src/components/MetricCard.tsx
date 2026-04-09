interface Props {
  label: string;
  value: string;
  positive?: boolean;
}

export function MetricCard({ label, value, positive }: Props) {
  const colorClass = positive === undefined
    ? 'text-white'
    : positive
      ? 'text-emerald-400'
      : 'text-red-400';

  return (
    <div className="card text-center">
      <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
      <p className={`text-lg font-semibold font-mono ${colorClass}`}>{value}</p>
    </div>
  );
}
