import { normalizeRiskLevel, riskColor, riskBgColor, riskTextColor } from '../../utils/risk';

interface RiskBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export default function RiskBadge({ level, size = 'sm', showDot = true }: RiskBadgeProps) {
  const norm = normalizeRiskLevel(level);
  const color = riskColor(norm);
  const bg = riskBgColor(norm);
  const text = riskTextColor(norm);

  return (
    <span
      className={`risk-badge risk-badge-${norm.toLowerCase()} risk-badge-${size}`}
      style={{
        backgroundColor: bg,
        color: text,
        border: `1px solid ${color}40`,
      }}
    >
      {showDot && (
        <span
          className="risk-badge-dot"
          style={{ backgroundColor: color }}
        />
      )}
      <span>{norm}</span>
    </span>
  );
}
