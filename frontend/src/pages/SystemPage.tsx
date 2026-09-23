import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '../components/layout/PageContainer';
import { fetchSystemStatus } from '../api/healthApi';
import { useNotificationStatus, useSendTestSms } from '../hooks/useAlerts';
import Loading from '../components/common/Loading';
import { Send } from 'lucide-react';

export default function SystemPage() {
  const { data: sysData, isLoading: sysLoading, refetch } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: fetchSystemStatus,
    refetchInterval: 10000,
  });

  const { data: notifData, isLoading: notifLoading } = useNotificationStatus();
  const testSmsMut = useSendTestSms();

  const [testSmsStatus, setTestSmsStatus] = useState<{
    text: string;
    type: 'success' | 'partial' | 'failure';
  } | null>(null);

  const [simMode, setSimMode] = useState('rising');
  const [simStatus, setSimStatus] = useState('');
  const [simRunning, setSimRunning] = useState(false);

  const handleSendTestSms = async () => {
    setTestSmsStatus(null);
    try {
      const res = await testSmsMut.mutateAsync();
      const delivery = res.delivery;
      if (delivery && delivery.sent === delivery.total && delivery.total > 0) {
        setTestSmsStatus({
          text: `SMS test successful: ${delivery.sent}/${delivery.total} sent`,
          type: 'success',
        });
      } else if (delivery && delivery.sent > 0) {
        setTestSmsStatus({
          text: `SMS test partial: ${delivery.sent}/${delivery.total} sent (${delivery.failed?.length || 0} failed)`,
          type: 'partial',
        });
      } else {
        const errDetail = delivery?.error || (delivery?.failed && delivery.failed[0]?.error);
        let msg = 'SMS test failed';
        if (errDetail) {
          if (errDetail.includes('Authenticate') || errDetail.includes('401') || errDetail.includes('API key') || errDetail.includes('x-api-key')) {
            msg = 'SMS test failed: TextBee authentication error. Verify your TEXTBEE_API_KEY in backend/.env.';
          } else {
            msg = `SMS test failed: ${errDetail}`;
          }
        }
        setTestSmsStatus({
          text: msg,
          type: 'failure',
        });
      }
    } catch (err: any) {
      setTestSmsStatus({
        text: `SMS test failed: ${err?.response?.data?.detail || err.message}`,
        type: 'failure',
      });
    }
  };

  const handleStartSim = () => {
    setSimRunning(true);
    setSimStatus(`To start the simulator, run in terminal:\n\npython -m scripts.moisture_simulator --sensor SM-001 --mode ${simMode}`);
  };

  const handleStopSim = () => {
    setSimRunning(false);
    setSimStatus('Simulator stopped. Press Ctrl+C in the terminal.');
  };

  if (sysLoading || notifLoading) return <Loading />;

  const status = sysData?.data;
  const isTextbeeConfigured = notifData?.textbee_configured ?? (status?.textbee_configured || false);
  const isSmsEnabled = notifData?.sms_enabled ?? (status?.sms_enabled || false);
  const recipientCount = notifData?.recipient_count ?? (status?.recipient_count || 4);
  const recipients = notifData?.recipients || status?.recipients || [];

  return (
    <PageContainer
      title="System Monitoring"
      subtitle="Operational health, TextBee SMS engine, and demo controls"
      actions={
        <button onClick={() => refetch()} className="btn btn-sm btn-outline">
          ↻ Refresh Status
        </button>
      }
    >
      <div className="system-grid">
        {/* Operational Infrastructure Status */}
        <div className="card">
          <div className="card-header">
            <h3>Infrastructure & Services</h3>
          </div>
          <div>
            <div className="system-status-item">
              <span className={`status-dot ${status?.api_status === 'operational' ? 'ok' : 'error'}`} />
              <span className="status-label">API</span>
              <span className="status-value">{status?.api_status === 'operational' ? 'Operational' : 'Degraded'}</span>
            </div>
            <div className="system-status-item">
              <span className={`status-dot ${status?.database_status === 'connected' ? 'ok' : 'error'}`} />
              <span className="status-label">Database</span>
              <span className="status-value">{status?.database_status === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="system-status-item">
              <span className={`status-dot ${status?.websocket_enabled ? 'ok' : 'warn'}`} />
              <span className="status-label">WebSocket</span>
              <span className="status-value">
                {status?.websocket_enabled ? 'Connected' : 'Disabled'}
                {status?.websocket_connections !== undefined && ` (${status.websocket_connections} active)`}
              </span>
            </div>
            <div className="system-status-item">
              <span className={`status-dot ${status?.ai_ml_mode ? 'ok' : 'warn'}`} />
              <span className="status-label">AI/ML Mode</span>
              <span className="status-value">{status?.ai_ml_mode || 'demo'}</span>
            </div>
          </div>
        </div>

        {/* TextBee SMS Alert Engine */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>TextBee SMS Engine</h3>
            <button
              onClick={handleSendTestSms}
              disabled={testSmsMut.isPending}
              className="btn btn-sm btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {testSmsMut.isPending ? 'Sending...' : (
                <>
                  <Send size={14} />
                  <span>Send Test SMS</span>
                </>
              )}
            </button>
          </div>
          <div>
            <div className="system-status-item">
              <span className={`status-dot ${isTextbeeConfigured ? 'ok' : 'warn'}`} />
              <span className="status-label">TextBee</span>
              <span className="status-value">{isTextbeeConfigured ? 'Configured' : 'Missing Credentials'}</span>
            </div>
            <div className="system-status-item">
              <span className={`status-dot ${isSmsEnabled ? 'ok' : 'error'}`} />
              <span className="status-label">SMS</span>
              <span className="status-value">{isSmsEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="system-status-item">
              <span className="status-dot ok" />
              <span className="status-label">SMS Recipients</span>
              <span className="status-value">{recipientCount}</span>
            </div>
            {status?.active_alerts !== undefined && (
              <div className="system-status-item">
                <span className={`status-dot ${status.active_alerts > 0 ? 'warn' : 'ok'}`} />
                <span className="status-label">Active Alerts</span>
                <span className="status-value">{status.active_alerts}</span>
              </div>
            )}
          </div>

          {testSmsStatus && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor:
                  testSmsStatus.type === 'success'
                    ? '#dcfce7'
                    : testSmsStatus.type === 'partial'
                    ? '#fef3c7'
                    : '#fee2e2',
                color:
                  testSmsStatus.type === 'success'
                    ? '#15803d'
                    : testSmsStatus.type === 'partial'
                    ? '#b45309'
                    : '#b91c1c',
                border: `1px solid ${
                  testSmsStatus.type === 'success'
                    ? '#86efac'
                    : testSmsStatus.type === 'partial'
                    ? '#fde68a'
                    : '#fca5a5'
                }`,
              }}
            >
              {testSmsStatus.text}
            </div>
          )}
        </div>

        {/* Emergency SMS Recipient Roster */}
        <div className="card">
          <div className="card-header">
            <h3>Configured Demo Recipients ({recipients.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {recipients.map((r: { name: string; phone_number: string }, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 4,
                  fontSize: 13,
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.name}</span>
                <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>{r.phone_number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Overview */}
        <div className="card">
          <div className="card-header"><h3>Sensor Telemetry</h3></div>
          {status?.sensors && (
            <div>
              <div className="system-status-item">
                <span className="status-dot ok" />
                <span className="status-label">Online</span>
                <span className="status-value">{status.sensors.online}</span>
              </div>
              <div className="system-status-item">
                <span className="status-dot warn" />
                <span className="status-label">Warning</span>
                <span className="status-value">{status.sensors.warning}</span>
              </div>
              <div className="system-status-item">
                <span className="status-dot error" />
                <span className="status-label">Offline</span>
                <span className="status-value">{status.sensors.offline}</span>
              </div>
              <div className="system-status-item">
                <span className="status-dot ok" />
                <span className="status-label">Total</span>
                <span className="status-value">{status.sensors.total}</span>
              </div>
            </div>
          )}
        </div>

        {/* Moisture Thresholds */}
        <div className="card">
          <div className="card-header"><h3>Moisture Thresholds</h3></div>
          {status?.moisture_thresholds && (
            <div>
              <div className="system-status-item">
                <span className="status-dot ok" />
                <span className="status-label">Normal Range</span>
                <span className="status-value">0% – {status.moisture_thresholds.warning}%</span>
              </div>
              <div className="system-status-item">
                <span className="status-dot warn" />
                <span className="status-label">Warning Threshold</span>
                <span className="status-value">{status.moisture_thresholds.warning}%</span>
              </div>
              <div className="system-status-item">
                <span className="status-dot error" />
                <span className="status-label">High Threshold</span>
                <span className="status-value">{status.moisture_thresholds.high}%</span>
              </div>
              <div className="system-status-item">
                <span className="status-dot error" />
                <span className="status-label">Offline Timeout</span>
                <span className="status-value">{status.moisture_thresholds.offline_seconds}s</span>
              </div>
            </div>
          )}
        </div>

        {/* Demo Simulator Controls */}
        <div className="card">
          <div className="card-header"><h3>Moisture Simulator Controls</h3></div>
          <div className="form-group">
            <label className="form-label">Simulation Mode</label>
            <select
              className="form-select"
              value={simMode}
              onChange={(e) => setSimMode(e.target.value)}
            >
              <option value="normal">Normal (stable ~45%)</option>
              <option value="rising">Rising (increasing moisture toward HIGH)</option>
              <option value="high">High (sustained high moisture ~75%+)</option>
              <option value="oscillating">Oscillating (fluctuating wave)</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            {!simRunning ? (
              <button onClick={handleStartSim} className="btn btn-primary">
                Show Simulator Command
              </button>
            ) : (
              <button onClick={handleStopSim} className="btn btn-danger">
                Stop Simulator
              </button>
            )}
          </div>
          {simStatus && (
            <div style={{
              marginTop: 12, padding: 12, background: '#f9fafb',
              border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13,
              fontFamily: 'monospace', whiteSpace: 'pre-wrap',
            }}>
              {simStatus}
            </div>
          )}
          <div className="text-muted text-sm mt-3">
            Run the moisture simulator to trigger real sensor telemetry and automated risk alerts.
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
