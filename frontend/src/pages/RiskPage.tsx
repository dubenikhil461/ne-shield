import { useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import { useRiskCurrent, useRiskZone } from '../hooks/useRisk';
import RiskBadge from '../components/risk/RiskBadge';
import RiskSummary from '../components/risk/RiskSummary';
import RiskExplanation from '../components/risk/RiskExplanation';
import RiskTimeline from '../components/risk/RiskTimeline';
import CreateAlertModal from '../components/alerts/CreateAlertModal';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatMoisture, formatScore } from '../utils/formatters';
import { Plus } from 'lucide-react';

export default function RiskPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data, isLoading, error, refetch } = useRiskCurrent();
  const { data: zoneDetail } = useRiskZone(selectedZoneId);

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message="Failed to load risk data" onRetry={refetch} />;

  const zones = data?.data || [];
  const selected = zoneDetail;

  const criticalCount = zones.filter((z: { risk_level: string }) => z.risk_level === 'CRITICAL').length;
  const highCount = zones.filter((z: { risk_level: string }) => z.risk_level === 'HIGH').length;

  return (
    <PageContainer
      title="Risk Assessment"
      subtitle={`${zones.length} zones monitored • ${criticalCount} critical • ${highCount} high`}
    >
      {/* Summary */}
      <div className="summary-cards mb-4">
        <div className="summary-card">
          <div className="summary-card-label">Critical Zones</div>
          <div className="summary-card-value" style={{ color: criticalCount > 0 ? '#7f1d1d' : '#22c55e' }}>
            {criticalCount}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">High Risk</div>
          <div className="summary-card-value" style={{ color: highCount > 0 ? '#dc2626' : '#22c55e' }}>
            {highCount}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Medium</div>
          <div className="summary-card-value">
            {zones.filter((z: { risk_level: string }) => z.risk_level === 'MEDIUM').length}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Low</div>
          <div className="summary-card-value" style={{ color: '#22c55e' }}>
            {zones.filter((z: { risk_level: string }) => z.risk_level === 'LOW').length}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Zone list */}
        <div className="card">
          <div className="card-header"><h3>Risk Zones</h3></div>
          <table className="table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Susceptibility</th>
                <th>Moisture</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z: {
                zone_id: number; zone_code: string; zone_name: string;
                risk_level: string; risk_score: number; susceptibility_score: number;
                current_moisture: number | null; moisture_trend: number | null;
                moisture_status: string | null; sensor_code: string | null;
                sensor_status: string | null; latest_reading_at: string | null;
                factors: { name: string; label: string; value: number; severity: string }[];
                updated_at: string;
              }) => (
                <tr
                  key={z.zone_id}
                  onClick={() => setSelectedZoneId(z.zone_id)}
                  style={{ cursor: 'pointer', background: z.zone_id === selectedZoneId ? '#eff6ff' : undefined }}
                >
                  <td style={{ fontWeight: 500 }}>{z.zone_code}</td>
                  <td><RiskBadge level={z.risk_level} /></td>
                  <td>{formatScore(z.risk_score)}</td>
                  <td>{formatScore(z.susceptibility_score)}</td>
                  <td>{formatMoisture(z.current_moisture)}</td>
                  <td style={{
                    color: (z.moisture_trend ?? 0) > 5 ? '#dc2626' : (z.moisture_trend ?? 0) < -5 ? '#22c55e' : '#374151'
                  }}>
                    {z.moisture_trend !== null ? `${z.moisture_trend > 0 ? '+' : ''}${z.moisture_trend.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Zone detail */}
        <div>
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} /> Issue Alert for {selected.zone_code}
                </button>
              </div>
              <RiskSummary assessment={selected} />
              <RiskExplanation factors={selected.factors || []} />
              <RiskTimeline zoneCode={selected.zone_code} />
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <p className="text-muted">Select a zone to view risk details</p>
            </div>
          )}
        </div>
      </div>

      <CreateAlertModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultZoneId={selected?.zone_id}
      />
    </PageContainer>
  );
}
