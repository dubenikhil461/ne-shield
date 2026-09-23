import type { RiskAssessment } from '../../api/riskApi';
import { formatDate, formatMoisture } from '../../utils/formatters';
import DetailDrawer from '../common/DetailDrawer';
import RiskBadge from './RiskBadge';
import {
  Clock,
} from 'lucide-react';

interface Props {
  zone: RiskAssessment | null;
  open: boolean;
  onClose: () => void;
  onViewOnMap?: (zoneId: number) => void;
}

export default function RiskZoneDrawer({
  zone,
  open,
  onClose,
  onViewOnMap,
}: Props) {
  if (!zone) return null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={`${zone.zone_code} • ${zone.zone_name}`}
      subtitle="Hazard Susceptibility & Soil Saturation Analysis"
      badge={<RiskBadge level={zone.risk_level} size="md" />}
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Close Inspector
          </button>
          {onViewOnMap && (
            <button
              type="button"
              onClick={() => {
                onViewOnMap(zone.zone_id);
                onClose();
              }}
              className="btn btn-primary"
            >
              Locate on Live Map
            </button>
          )}
        </div>
      }
    >
      {/* Metric summary */}
      <div className="drawer-section">
        <h4 className="drawer-section-title">RISK METRIC COEFFICIENTS</h4>
        <div className="grid-3 gap-2">
          <div className="drawer-metric-box">
            <span className="drawer-metric-label">Composite Risk Score</span>
            <span className="drawer-metric-val">{zone.risk_score.toFixed(2)}</span>
            <span className="drawer-metric-hint">Normalized [0 - 1.0]</span>
          </div>

          <div className="drawer-metric-box">
            <span className="drawer-metric-label">Susceptibility Index</span>
            <span className="drawer-metric-val">{zone.susceptibility_score.toFixed(2)}</span>
            <span className="drawer-metric-hint">Slope & geological base</span>
          </div>

          <div className="drawer-metric-box">
            <span className="drawer-metric-label">Soil Moisture</span>
            <span className="drawer-metric-val text-teal">
              {formatMoisture(zone.current_moisture)}
            </span>
            <span className="drawer-metric-hint">
              {zone.moisture_status || 'Sensor Telemetry'}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor & Telemetry */}
      <div className="drawer-section">
        <h4 className="drawer-section-title">ASSOCIATED IOT TELEMETRY NODE</h4>
        <div className="drawer-kv-grid">
          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Sensor Unit Code</span>
            <span className="drawer-kv-val font-semibold">
              {zone.sensor_code || 'Unassigned / Model Estimation'}
            </span>
          </div>

          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Sensor Status</span>
            <span className={`badge ${zone.sensor_status === 'ONLINE' ? 'badge-online' : 'badge-offline'}`}>
              {zone.sensor_status || 'INFERRED'}
            </span>
          </div>

          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Moisture Trend (24h)</span>
            <span className="drawer-kv-val">
              {zone.moisture_trend != null
                ? `${zone.moisture_trend > 0 ? '+' : ''}${zone.moisture_trend.toFixed(1)}%`
                : 'Steady'}
            </span>
          </div>

          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Last Reading At</span>
            <span className="drawer-kv-val">
              {zone.latest_reading_at ? formatDate(zone.latest_reading_at) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Risk Factors */}
      {zone.factors && zone.factors.length > 0 && (
        <div className="drawer-section">
          <h4 className="drawer-section-title">TRIGGER FACTOR WEIGHTS</h4>
          <div className="drawer-factors-list">
            {zone.factors.map((f) => (
              <div key={f.name} className="drawer-factor-item">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-navy">{f.label || f.name}</span>
                  <span className="text-xs text-muted font-mono">{f.value.toFixed(2)}</span>
                </div>
                <div className="drawer-factor-bar-bg">
                  <div
                    className="drawer-factor-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, f.value * 100))}%`,
                      backgroundColor:
                        f.value > 0.7 ? '#B91C1C' : f.value > 0.4 ? '#D97706' : '#15803D',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="drawer-section">
        <div className="text-xs text-muted flex items-center gap-1">
          <Clock size={12} />
          <span>Last calculation timestamp: {formatDate(zone.updated_at)}</span>
        </div>
      </div>
    </DetailDrawer>
  );
}
