import type { RiskFactor } from '../../api/riskApi';
import { riskColor } from '../../utils/risk';

interface Props {
  factors: RiskFactor[];
}

export default function RiskExplanation({ factors }: Props) {
  if (!factors.length) {
    return (
      <div className="risk-panel">
        <h3 className="mb-3">Contributing Factors</h3>
        <p className="text-muted text-sm">No significant risk factors detected.</p>
      </div>
    );
  }

  return (
    <div className="risk-panel">
      <h3 className="mb-3">Contributing Factors</h3>
      {factors.map((f, i) => {
        const color = riskColor(f.severity);
        return (
          <div key={i} className="risk-panel-row">
            <span className="risk-panel-label flex items-center gap-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: color,
                  display: 'inline-block',
                }}
              />
              {f.label}
            </span>
            <span className="risk-panel-value font-mono">{f.value.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}
