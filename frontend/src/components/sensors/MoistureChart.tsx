import type { SensorReading } from '../../api/sensorApi';

interface Props {
  readings: SensorReading[];
  width?: number;
  height?: number;
}

export default function MoistureChart({ readings, width = 600, height = 180 }: Props) {
  if (!readings.length) {
    return (
      <div className="moisture-chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="text-muted">No moisture data available</span>
      </div>
    );
  }

  // Sort chronologically
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const values = sorted.map((r) => r.moisture_percent ?? 0);
  const minVal = Math.max(0, Math.min(...values) - 5);
  const maxVal = Math.min(100, Math.max(...values) + 5);

  const xScale = (i: number) =>
    pad.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
  const yScale = (v: number) =>
    pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const points = values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
  const areaPoints = `${xScale(0)},${pad.top + chartH} ${points} ${xScale(values.length - 1)},${pad.top + chartH}`;

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minVal + (i / yTicks) * (maxVal - minVal)
  );

  return (
    <div className="moisture-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTickValues.map((tick, i) => (
          <g key={i}>
            <line
              x1={pad.left} y1={yScale(tick)}
              x2={width - pad.right} y2={yScale(tick)}
              stroke="#e5e7eb" strokeWidth={0.5}
            />
            <text x={pad.left - 5} y={yScale(tick) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {Math.round(tick)}%
            </text>
          </g>
        ))}

        {/* Threshold lines */}
        <line
          x1={pad.left} y1={yScale(75)}
          x2={width - pad.right} y2={yScale(75)}
          stroke="#dc2626" strokeWidth={1} strokeDasharray="4 2" opacity={0.4}
        />
        <line
          x1={pad.left} y1={yScale(65)}
          x2={width - pad.right} y2={yScale(65)}
          stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" opacity={0.4}
        />

        {/* Area fill */}
        <polygon points={areaPoints} fill="rgba(37,99,235,0.08)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {values.map((v, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(v)} r={3} fill="#2563eb" />
        ))}

        {/* Labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" fontSize={10} fill="#9ca3af">
          Time →
        </text>
      </svg>
    </div>
  );
}
