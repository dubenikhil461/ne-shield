import type { RiskAssessment } from '../../api/riskApi';
import RiskBadge from './RiskBadge';
import { formatMoisture, formatScore } from '../../utils/formatters';
import LiveIndicator from '../sensors/LiveIndicator';

interface Props {
  assessment: RiskAssessment;
}

export default function RiskSummary({ assessment }: Props) {
  return (
    <div className="risk-panel">
      <div className="flex items-center gap-3 mb-3">
        <h3>{assessment.zone_name}</h3>
        <RiskBadge level={assessment.risk_level} />
      </div>
      <div className="risk-panel-row">
        <span className="risk-panel-label">Risk Score</span>
        <span className="risk-panel-value">{formatScore(assessment.risk_score)}</span>
      </div>
      <div className="risk-panel-row">
        <span className="risk-panel-label">Susceptibility</span>
        <span className="risk-panel-value">{formatScore(assessment.susceptibility_score)}</span>
      </div>
      <div className="risk-panel-row">
        <span className="risk-panel-label">Soil Moisture</span>
        <span className="risk-panel-value flex items-center gap-1">
          {assessment.current_moisture !== null && <LiveIndicator />}
          {formatMoisture(assessment.current_moisture)}
        </span>
      </div>
      {assessment.moisture_trend !== null && (
        <div className="risk-panel-row">
          <span className="risk-panel-label">Moisture Trend</span>
          <span className="risk-panel-value" style={{
            color: assessment.moisture_trend > 5 ? '#dc2626' :
                   assessment.moisture_trend < -5 ? '#22c55e' : '#374151'
          }}>
            {assessment.moisture_trend > 0 ? '+' : ''}{assessment.moisture_trend.toFixed(1)}%
          </span>
        </div>
      )}
      {assessment.sensor_code && (
        <div className="risk-panel-row">
          <span className="risk-panel-label">Sensor</span>
          <span className="risk-panel-value">
            {assessment.sensor_code}
            <span className={`badge badge-sm ${assessment.sensor_status === 'ONLINE' ? 'badge-online' : 'badge-offline'}`}
              style={{ marginLeft: 6 }}>
              {assessment.sensor_status}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
