import { useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import { useAlerts, useAcknowledgeAlert, useResolveAlert, useSendAlertSms } from '../hooks/useAlerts';
import AlertCard, { type SmsStatusFeedback } from '../components/alerts/AlertCard';
import AlertDetails from '../components/alerts/AlertDetails';
import CreateAlertModal from '../components/alerts/CreateAlertModal';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import type { Alert } from '../api/alertApi';
import { Plus, Bell } from 'lucide-react';

export default function AlertsPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [sendingSmsId, setSendingSmsId] = useState<number | null>(null);
  const [smsStatuses, setSmsStatuses] = useState<Record<number, SmsStatusFeedback>>({});

  const { data, isLoading } = useAlerts({
    status: filterStatus || undefined,
    alert_level: filterLevel || undefined,
  });

  const ackMut = useAcknowledgeAlert();
  const resMut = useResolveAlert();
  const sendSmsMut = useSendAlertSms();

  const handleSendSms = async (alertId: number) => {
    setSendingSmsId(alertId);
    try {
      const res = await sendSmsMut.mutateAsync(alertId);
      const delivery = res.delivery;
      if (delivery && delivery.sent === delivery.total && delivery.total > 0) {
        setSmsStatuses((prev) => ({
          ...prev,
          [alertId]: {
            text: `SMS: ${delivery.sent}/${delivery.total} sent`,
            type: 'success',
          },
        }));
      } else if (delivery && delivery.sent > 0) {
        setSmsStatuses((prev) => ({
          ...prev,
          [alertId]: {
            text: `SMS: ${delivery.sent}/${delivery.total} sent`,
            type: 'partial',
          },
        }));
      } else {
        const errDetail = delivery?.error || (delivery?.failed && delivery.failed[0]?.error);
        let msg = 'SMS failed';
        if (errDetail) {
          if (errDetail.includes('Authenticate') || errDetail.includes('401') || errDetail.includes('API key') || errDetail.includes('x-api-key')) {
            msg = 'SMS failed: TextBee auth error (check API Key)';
          } else {
            msg = `SMS failed: ${errDetail}`;
          }
        }
        setSmsStatuses((prev) => ({
          ...prev,
          [alertId]: {
            text: msg,
            type: 'failure',
          },
        }));
      }
    } catch (err: any) {
      setSmsStatuses((prev) => ({
        ...prev,
        [alertId]: {
          text: `SMS error: ${err?.response?.data?.detail || err.message}`,
          type: 'failure',
        },
      }));
    } finally {
      setSendingSmsId(null);
    }
  };

  if (isLoading) return <Loading />;

  const alerts = data?.data || [];
  const activeCount = data?.active_count ?? 0;
  const ackCount = data?.acknowledged_count ?? 0;
  const resCount = data?.resolved_count ?? 0;

  return (
    <PageContainer
      title="Alert Center"
      subtitle={`${activeCount} active • ${ackCount} acknowledged • ${resCount} resolved`}
      actions={
        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Create Alert
        </button>
      }
    >
      {/* Summary */}
      <div className="summary-cards mb-4">
        <div className="summary-card">
          <div className="summary-card-label">Active</div>
          <div className="summary-card-value" style={{ color: activeCount > 0 ? '#dc2626' : '#22c55e' }}>
            {activeCount}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Acknowledged</div>
          <div className="summary-card-value" style={{ color: '#f59e0b' }}>{ackCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Resolved</div>
          <div className="summary-card-value" style={{ color: '#22c55e' }}>{resCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Total</div>
          <div className="summary-card-value">{data?.total ?? 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select className="form-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="">All Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <EmptyState message="No alerts match the current filters" icon={<Bell size={32} />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map((alert: Alert) => (
            <div key={alert.id} onClick={() => setSelectedAlert(alert)} style={{ cursor: 'pointer' }}>
              <AlertCard
                alert={alert}
                onAcknowledge={(id) => ackMut.mutate(id)}
                onResolve={(id) => resMut.mutate(id)}
                onSendSms={(id) => handleSendSms(id)}
                sendingSms={sendingSmsId === alert.id}
                smsStatus={smsStatuses[alert.id]}
              />
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <AlertDetails
        alert={selectedAlert}
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={(id) => ackMut.mutate(id)}
        onResolve={(id) => resMut.mutate(id)}
      />

      {/* Create Alert Modal */}
      <CreateAlertModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </PageContainer>
  );
}
