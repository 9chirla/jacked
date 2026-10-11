type Point = { x: string; y: number };

type LineChartProps = {
  points: Point[];
  label: string;
  unit: string;
  emptyMessage: string;
};

/** Minimal SVG chart — no fabricated series; empty when points.length === 0. */
export function LineChart({
  points,
  label,
  unit,
  emptyMessage,
}: LineChartProps) {
  if (points.length === 0) {
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

  const width = 320;
  const height = 140;
  const pad = 16;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x =
      pad + (i * (width - pad * 2)) / Math.max(points.length - 1, 1);
    const y = height - pad - ((p.y - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  });

  return (
    <figure>
      <figcaption className="mb-2 text-[14px] text-muted">
        {label} ({unit})
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full rounded-[var(--radius)] border border-line bg-surface"
        role="img"
        aria-label={`${label} chart`}
      >
        <polyline
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="2"
          points={coords.join(" ")}
        />
        {points.map((p, i) => {
          const [x, y] = coords[i].split(",").map(Number);
          return (
            <circle
              key={`${p.x}-${i}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="var(--accent)"
              stroke="var(--accent-ink)"
              aria-label={`${p.x}: ${p.y} ${unit}`}
            />
          );
        })}
      </svg>
      <details className="mt-2">
        <summary className="min-h-12 cursor-pointer text-[14px] text-muted">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-[14px]">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.x} className="border-t border-line">
                <td className="py-1">{p.x}</td>
                <td className="tabular py-1">{p.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
