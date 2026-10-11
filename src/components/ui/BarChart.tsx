type Bar = { label: string; value: number };

type BarChartProps = {
  bars: Bar[];
  label: string;
  unit: string;
  emptyMessage: string;
};

export function BarChart({
  bars,
  label,
  unit,
  emptyMessage,
}: BarChartProps) {
  if (bars.length === 0) {
    return (
      <div
        role="img"
        aria-label={label}
        className="rounded-[var(--radius)] border border-dashed border-line p-4 text-[14px] text-muted"
      >
        {emptyMessage}
      </div>
    );
  }

  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <figure>
      <figcaption className="mb-2 text-[14px] text-muted">
        {label} ({unit})
      </figcaption>
      <ul className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-3">
        {bars.map((bar) => (
          <li key={bar.label}>
            <div className="mb-1 flex justify-between text-[12px] text-muted">
              <span>{bar.label}</span>
              <span className="tabular text-ink">
                {bar.value} {unit}
              </span>
            </div>
            <div className="h-3 rounded-full bg-bg">
              <div
                className="h-3 rounded-full bg-accent"
                style={{ width: `${(bar.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
