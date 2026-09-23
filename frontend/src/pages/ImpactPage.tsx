import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '../components/layout/PageContainer';
import { fetchZoneImpact, fetchRoads, fetchVillages } from '../api/impactApi';
import { useRiskCurrent } from '../hooks/useRisk';
import { formatDistance, formatPopulation } from '../utils/formatters';
import RiskBadge from '../components/risk/RiskBadge';
import Loading from '../components/common/Loading';
import { Route, Building2 } from 'lucide-react';

export default function ImpactPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const { data: riskData } = useRiskCurrent();
  const { data: impactData, isLoading: impactLoading } = useQuery({
    queryKey: ['zoneImpact', selectedZoneId],
    queryFn: () => fetchZoneImpact(selectedZoneId!),
    enabled: !!selectedZoneId,
  });
  const { data: roadsData } = useQuery({ queryKey: ['roads'], queryFn: fetchRoads });
  const { data: villagesData } = useQuery({ queryKey: ['villages'], queryFn: fetchVillages });

  const zones = riskData?.data || [];
  const roads = roadsData?.data || [];
  const villages = villagesData?.data || [];
  const impact = impactData;

  const atRiskRoads = roads.filter((r: { status: string }) => r.status === 'AT_RISK' || r.status === 'BLOCKED');
  const totalPop = villages.reduce((sum: number, v: { population: number }) => sum + v.population, 0);

  return (
    <PageContainer title="Impact Analysis" subtitle="Infrastructure and settlement impact assessment">
      {/* Summary */}
      <div className="summary-cards mb-4">
        <div className="summary-card">
          <div className="summary-card-label">Total Roads</div>
          <div className="summary-card-value">{roads.length}</div>
          <div className="summary-card-sub">{atRiskRoads.length} at risk</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Total Villages</div>
          <div className="summary-card-value">{villages.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Total Population</div>
          <div className="summary-card-value">{formatPopulation(totalPop)}</div>
        </div>
        {impact && (
          <div className="summary-card">
            <div className="summary-card-label">Population at Risk</div>
            <div className="summary-card-value" style={{ color: impact.total_population_at_risk > 0 ? '#dc2626' : '#22c55e' }}>
              {formatPopulation(impact.total_population_at_risk)}
            </div>
          </div>
        )}
      </div>

      {/* Zone selector */}
      <div className="filter-bar mb-4">
        <label className="form-label" style={{ marginBottom: 0 }}>Select Risk Zone:</label>
        <select
          className="form-select"
          value={selectedZoneId || ''}
          onChange={(e) => setSelectedZoneId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Select a zone —</option>
          {zones.map((z: { zone_id: number; zone_code: string; risk_level: string }) => (
            <option key={z.zone_id} value={z.zone_id}>
              {z.zone_code} [{z.risk_level}]
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2">
        {/* Impact detail */}
        <div className="card">
          <div className="card-header">
            <h3>Zone Impact Detail</h3>
          </div>
          {impactLoading ? (
            <Loading text="Analyzing impact..." />
          ) : impact ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3>{impact.zone_name}</h3>
                <RiskBadge level={impact.risk_level} />
              </div>

              <h4 className="mb-3">Affected Roads ({impact.affected_roads.length})</h4>
              {impact.affected_roads.length === 0 ? (
                <p className="text-muted text-sm mb-4">No roads affected</p>
              ) : (
                <div className="mb-4">
                  {impact.affected_roads.map((road: {
                    id: number; road_name: string; road_type: string;
                    status: string; distance_km: number | null;
                  }) => (
                    <div key={road.id} className="impact-item">
                      <span className="impact-icon"><Route size={18} className="text-teal" /></span>
                      <div className="impact-details">
                        <div className="impact-name">{road.road_name}</div>
                        <div className="impact-sub">
                          {road.road_type} • {road.status} • {formatDistance(road.distance_km)} away
                        </div>
                      </div>
                      <span className={`badge badge-${road.status === 'BLOCKED' ? 'critical' : road.status === 'AT_RISK' ? 'high' : 'low'}`}>
                        {road.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="mb-3">Affected Villages ({impact.potentially_affected_villages.length})</h4>
              {impact.potentially_affected_villages.length === 0 ? (
                <p className="text-muted text-sm">No villages affected</p>
              ) : (
                <div>
                  {impact.potentially_affected_villages.map((v: {
                    id: number; name: string; population: number;
                    distance_km: number | null;
                  }) => (
                    <div key={v.id} className="impact-item">
                      <span className="impact-icon"><Building2 size={18} className="text-navy" /></span>
                      <div className="impact-details">
                        <div className="impact-name">{v.name}</div>
                        <div className="impact-sub">
                          Population: {formatPopulation(v.population)} • {formatDistance(v.distance_km)} away
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="risk-panel-row mt-3">
                <span className="risk-panel-label">Alternative Routes Available</span>
                <span className={`badge ${impact.alternative_routes_available ? 'badge-online' : 'badge-offline'}`}>
                  {impact.alternative_routes_available ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p className="text-muted">Select a zone to view impact analysis</p>
            </div>
          )}
        </div>

        {/* All roads & villages */}
        <div>
          <div className="card mb-4">
            <div className="card-header"><h3>All Roads</h3></div>
            <table className="table">
              <thead>
                <tr><th>Road</th><th>Type</th><th>Status</th></tr>
              </thead>
              <tbody>
                {roads.map((r: { id: number; road_name: string; road_type: string; status: string }) => (
                  <tr key={r.id}>
                    <td>{r.road_name}</td>
                    <td className="text-muted">{r.road_type}</td>
                    <td>
                      <span className={`badge badge-${r.status === 'BLOCKED' ? 'critical' : r.status === 'AT_RISK' ? 'high' : 'low'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header"><h3>All Villages</h3></div>
            <table className="table">
              <thead>
                <tr><th>Village</th><th>Population</th><th>Location</th></tr>
              </thead>
              <tbody>
                {villages.map((v: { id: number; name: string; population: number; latitude: number; longitude: number }) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td>{formatPopulation(v.population)}</td>
                    <td className="text-muted text-sm">{v.latitude.toFixed(3)}, {v.longitude.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
