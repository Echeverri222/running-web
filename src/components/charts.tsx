type Point = {
  x: number;
  y: number;
};

type ZoneBand = {
  label: string;
  min: number;
  max: number;
  color: string;
};

function buildPolyline(points: Point[], width: number, height: number, minY?: number, maxY?: number) {
  if (points.length === 0) {
    return "";
  }

  const maxX = Math.max(...points.map((point) => point.x), 1);
  const localMinY = minY ?? Math.min(...points.map((point) => point.y));
  const localMaxY = maxY ?? Math.max(...points.map((point) => point.y));
  const yRange = localMaxY - localMinY || 1;

  return points
    .map((point) => {
      const x = (point.x / maxX) * width;
      const y = height - ((point.y - localMinY) / yRange) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function sampleEvery<T>(items: T[], maxPoints = 120) {
  if (items.length <= maxPoints) {
    return items;
  }

  const stride = Math.ceil(items.length / maxPoints);
  return items.filter((_, index) => index % stride === 0);
}

function formatYAxisValue(value: number, unit?: string) {
  if (unit === "sec-per-km") {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return `${Math.round(value)}`;
}

export function TrendChart({
  title,
  subtitle,
  points,
  color,
  yAxisUnit,
}: {
  title: string;
  subtitle: string;
  points: Point[];
  color: string;
  yAxisUnit?: "bpm" | "sec-per-km";
}) {
  const sampled = sampleEvery(points);
  const minY = sampled.length > 0 ? Math.min(...sampled.map((point) => point.y)) : 0;
  const maxY = sampled.length > 0 ? Math.max(...sampled.map((point) => point.y)) : 0;
  const polyline = buildPolyline(sampled, 640, 220, minY, maxY);
  const lastPoint = sampled[sampled.length - 1];

  return (
    <section className="card">
      <div className="section-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {sampled.length === 0 ? (
        <p className="muted">No hay datos suficientes para este grafico.</p>
      ) : (
        <div className="chart-shell">
          <svg viewBox="0 0 640 220" className="chart-svg" role="img" aria-label={title}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="640" height="220" rx="20" fill="rgba(255,255,255,0.56)" />
            <line x1="0" y1="24" x2="640" y2="24" stroke="rgba(17,24,39,0.08)" strokeDasharray="4 6" />
            <line x1="0" y1="110" x2="640" y2="110" stroke="rgba(17,24,39,0.08)" strokeDasharray="4 6" />
            <line x1="0" y1="196" x2="640" y2="196" stroke="rgba(17,24,39,0.08)" strokeDasharray="4 6" />
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polyline}
            />
            {lastPoint ? (
              <>
                <circle
                  cx={(lastPoint.x / Math.max(...sampled.map((point) => point.x), 1)) * 640}
                  cy={220 - ((lastPoint.y - minY) / ((maxY - minY) || 1)) * 220}
                  r="6"
                  fill={color}
                />
                <text x="572" y="28" fill={color} fontSize="13" fontWeight="700">
                  {formatYAxisValue(lastPoint.y, yAxisUnit)}
                </text>
              </>
            ) : null}
            <text x="12" y="20" fill="rgba(95,97,102,1)" fontSize="12">
              {formatYAxisValue(maxY, yAxisUnit)}
            </text>
            <text x="12" y="212" fill="rgba(95,97,102,1)" fontSize="12">
              {formatYAxisValue(minY, yAxisUnit)}
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}

export function HeartRateChart({
  title,
  subtitle,
  points,
  zones,
}: {
  title: string;
  subtitle: string;
  points: Point[];
  zones: ZoneBand[];
}) {
  const sampled = sampleEvery(points);
  const minY = zones[0]?.min ?? 80;
  const maxY = zones[zones.length - 1]?.max ?? 200;
  const polyline = buildPolyline(sampled, 640, 220, minY, maxY);
  const maxX = Math.max(...sampled.map((point) => point.x), 1);

  return (
    <section className="card">
      <div className="section-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {sampled.length === 0 ? (
        <p className="muted">No hay datos suficientes para este grafico.</p>
      ) : (
        <div className="chart-shell">
          <svg viewBox="0 0 640 220" className="chart-svg" role="img" aria-label={title}>
            <rect x="0" y="0" width="640" height="220" rx="20" fill="rgba(255,255,255,0.56)" />
            {zones.map((zone) => {
              const top = 220 - ((zone.max - minY) / ((maxY - minY) || 1)) * 220;
              const bottom = 220 - ((zone.min - minY) / ((maxY - minY) || 1)) * 220;
              return (
                <g key={zone.label}>
                  <rect
                    x="0"
                    y={top}
                    width="640"
                    height={Math.max(0, bottom - top)}
                    fill={zone.color}
                    opacity="0.12"
                  />
                  <text x="12" y={Math.min(214, top + 14)} fill={zone.color} fontSize="12" fontWeight="700">
                    {zone.label}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#dc2626"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polyline}
            />
            {sampled.map((point, index) => {
              if (index % 12 !== 0 && index !== sampled.length - 1) {
                return null;
              }

              return (
                <g key={`${point.x}-${point.y}`}>
                  <circle
                    cx={(point.x / maxX) * 640}
                    cy={220 - ((point.y - minY) / ((maxY - minY) || 1)) * 220}
                    r="4"
                    fill="#dc2626"
                  />
                  <text
                    x={(point.x / maxX) * 640 + 6}
                    y={220 - ((point.y - minY) / ((maxY - minY) || 1)) * 220 - 6}
                    fill="#991b1b"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {Math.round(point.y)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
