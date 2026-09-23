import { useState } from 'react';
import { Radio, Droplets, Battery, Clock, MapPin, Activity, RefreshCw } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { useSensors, useSensorReadings } from '../hooks/useSensors';
import SensorCard from '../components/sensors/SensorCard';
import MoistureChart from '../components/sensors/MoistureChart';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatMoisture, formatDate, timeAgo } from '../utils/formatters';
import { useMoistureWebSocket } from '../hooks/useMoistureWebSocket';

export default function SensorsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hours, setHours] = useState(24);
  const { connected } = useMoistureWebSocket();

  const { data, isLoading, error, refetch } = useSensors();
  const { data: readingsData } = useSensorReadings(selectedId, { hours });

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message="Failed to load sensors" onRetry={refetch} />;

  const sensors = data?.data || [];
  const selected = sensors.find((s: { id: number }) => s.id === selectedId);
  const readings = readingsData?.data || [];

  return (
    <PageContainer
      title="Telemetry & Sensor Grid"
      subtitle={`${sensors.length} sensors registered • ${sensors.filter((s: { status: string }) => s.status === 'ONLINE').length} online`}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="live-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {connected ? (
              <>
                <span className="live-dot" />
                <span>Live Stream</span>
              </>
            ) : (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                <span>Offline</span>
              </>
            )}
          </span>
          <button onClick={() => refetch()} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      }
    >
      <div className="sensor-detail-grid">
        {/* Sensor list */}
        <div>
          <div className="flex gap-2 mb-3">
            <select className="form-select" style={{ width: 'auto' }}>
              <option value="">All Types (Soil Moisture)</option>
              <option value="SOIL_MOISTURE">Soil Moisture Probes</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sensors.map((sensor: {
              id: number; sensor_code: string; name: string; sensor_type: string;
              latitude: number; longitude: number; status: string;
              last_seen_at: string | null; battery_level: number | null;
              current_moisture: number | null; created_at: string; updated_at: string;
            }) => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                selected={sensor.id === selectedId}
                onClick={() => setSelectedId(sensor.id)}
              />
            ))}
          </div>
        </div>

        {/* Sensor detail */}
        <div>
          {selected ? (
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio size={18} color="#0F766E" />
                  <h3 style={{ margin: 0 }}>{selected.sensor_code} — {selected.name}</h3>
                </div>
                <span className={`badge badge-${selected.status.toLowerCase()}`}>{selected.status}</span>
              </div>
              <div className="grid-3 mb-4">
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div className="summary-card-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Droplets size={13} color="#0284C7" /> Current Moisture
                  </div>
                  <div className="summary-card-value" style={{ color: '#0284C7', fontSize: 20 }}>
                    {formatMoisture(selected.current_moisture)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div className="summary-card-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Battery size={13} color="#0F766E" /> Battery Power
                  </div>
                  <div className="summary-card-value" style={{ fontSize: 20 }}>
                    {selected.battery_level ?? '—'}%
                  </div>
                </div>
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div className="summary-card-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} color="#64748B" /> Last Sync
                  </div>
                  <div className="summary-card-value" style={{ fontSize: 14, fontWeight: 600 }}>
                    {timeAgo(selected.last_seen_at)}
                  </div>
                </div>
              </div>
              <div className="risk-panel-row">
                <span className="risk-panel-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="#64748B" /> Coordinates
                </span>
                <span className="risk-panel-value font-mono">{selected.latitude.toFixed(4)}° N, {selected.longitude.toFixed(4)}° E</span>
              </div>
              <div className="risk-panel-row">
                <span className="risk-panel-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={14} color="#64748B" /> Sensor Classification
                </span>
                <span className="risk-panel-value">{selected.sensor_type}</span>
              </div>
              <div className="risk-panel-row">
                <span className="risk-panel-label">Telemetry Inception</span>
                <span className="risk-panel-value">{formatDate(selected.created_at)}</span>
              </div>

              {/* Moisture history */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#17324D' }}>Moisture Trendline</h3>
                  <select
                    className="form-select"
                    style={{ width: 'auto' }}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                  >
                    <option value={6}>Last 6 hours</option>
                    <option value={12}>Last 12 hours</option>
                    <option value={24}>Last 24 hours</option>
                    <option value={48}>Last 48 hours</option>
                    <option value={72}>Last 72 hours</option>
                  </select>
                </div>
                <MoistureChart readings={readings} />
                <div className="text-muted text-sm mt-2" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{readings.length} telemetric readings recorded</span>
                  <span>Reporting Window: Last {hours} Hours</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 10 }}>
              <Radio size={36} color="#94A3B8" />
              <p className="text-muted" style={{ margin: 0 }}>Select an operational telemetry node from the list to inspect live curves</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

