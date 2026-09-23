import type { Alert } from '../../api/alertApi';
import { formatDate } from '../../utils/formatters';
import DetailDrawer from '../common/DetailDrawer';
import RiskBadge from '../risk/RiskBadge';
import {
  CheckCircle2,
  Send,
} from 'lucide-react';

interface Props {
  alert: Alert | null;
  open: boolean;
  onClose: () => void;
  onAcknowledge?: (id: number) => void;
  onResolve?: (id: number) => void;
  onSendSms?: (id: number) => void;
  sendingSms?: boolean;
}

export default function AlertDetails({
  alert,
  open,
  onClose,
  onAcknowledge,
  onResolve,
  onSendSms,
  sendingSms = false,
}: Props) {
  if (!alert) return null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={alert.alert_code}
      subtitle={alert.title}
      badge={<RiskBadge level={alert.alert_level} size="md" />}
      footer={
        <div className="flex gap-2 justify-end w-full">
          {alert.status === 'ACTIVE' && onAcknowledge && (
            <button
              type="button"
              onClick={() => {
                onAcknowledge(alert.id);
                onClose();
              }}
              className="btn btn-warning"
            >
              Acknowledge
            </button>
          )}
          {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && onResolve && (
            <button
              type="button"
              onClick={() => {
                onResolve(alert.id);
                onClose();
              }}
              className="btn btn-success flex items-center gap-1"
            >
              <CheckCircle2 size={15} />
              Resolve Alert
            </button>
          )}
          {onSendSms && (
            <button
              type="button"
              onClick={() => onSendSms(alert.id)}
              disabled={sendingSms}
              className="btn btn-primary flex items-center gap-1"
            >
              <Send size={15} />
              {sendingSms ? 'Transmitting SMS...' : 'Dispatch SMS Alert'}
            </button>
          )}
        </div>
      }
    >
      <div className="drawer-section">
        <h4 className="drawer-section-title">INCIDENT SUMMARY</h4>
        <div className="drawer-kv-grid">
          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Alert Status</span>
            <span className={`badge badge-${alert.status.toLowerCase()}`}>
              {alert.status}
            </span>
          </div>
          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Target Zone</span>
            <span className="drawer-kv-val font-semibold">
              {alert.zone_name || alert.zone_code || `Zone #${alert.risk_zone_id}`}
            </span>
          </div>
          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Issued At</span>
            <span className="drawer-kv-val">{formatDate(alert.created_at)}</span>
          </div>
          {alert.resolved_at && (
            <div className="drawer-kv-item">
              <span className="drawer-kv-label">Resolved At</span>
              <span className="drawer-kv-val text-safe">{formatDate(alert.resolved_at)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="drawer-section">
        <h4 className="drawer-section-title">OFFICIAL ADVISORY MESSAGE</h4>
        <div className="drawer-box message-box">
          <p className="drawer-message-text">{alert.message}</p>
        </div>
      </div>

      {alert.reason && (
        <div className="drawer-section">
          <h4 className="drawer-section-title">THRESHOLD TRIGGER / REASON</h4>
          <div className="drawer-box bg-muted">
            <p className="text-sm text-secondary">{alert.reason}</p>
          </div>
        </div>
      )}

      {alert.delivery && (
        <div className="drawer-section">
          <h4 className="drawer-section-title">SMS BROADCAST TELEMETRY</h4>
          <div className="drawer-kv-grid">
            <div className="drawer-kv-item">
              <span className="drawer-kv-label">Total Recipients</span>
              <span className="drawer-kv-val font-bold">{alert.delivery.total}</span>
            </div>
            <div className="drawer-kv-item">
              <span className="drawer-kv-label">Successfully Sent</span>
              <span className="drawer-kv-val text-safe font-bold">{alert.delivery.sent}</span>
            </div>
            <div className="drawer-kv-item">
              <span className="drawer-kv-label">Failed Deliveries</span>
              <span className="drawer-kv-val text-danger font-bold">
                {alert.delivery.failed?.length || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
