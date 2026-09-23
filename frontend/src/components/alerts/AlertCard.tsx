import type { Alert } from '../../api/alertApi';
import { formatDate, timeAgo } from '../../utils/formatters';
import RiskBadge from '../risk/RiskBadge';
import {
  AlertTriangle,
  ShieldAlert,
  Send,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export interface SmsStatusFeedback {
  text: string;
  type: 'success' | 'partial' | 'failure' | 'info';
}

interface Props {
  alert: Alert;
  onAcknowledge?: (id: number) => void;
  onResolve?: (id: number) => void;
  onSendSms?: (id: number) => void;
  onSelect?: (alert: Alert) => void;
  sendingSms?: boolean;
  smsStatus?: SmsStatusFeedback;
  compact?: boolean;
}

export default function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onSendSms,
  onSelect,
  sendingSms = false,
  smsStatus,
  compact = false,
}: Props) {
  const isCritical = alert.alert_level === 'CRITICAL';
  const isHigh = alert.alert_level === 'HIGH';

  const feedback =
    smsStatus ||
    (alert.delivery
      ? ({
          text:
            alert.delivery.sent === alert.delivery.total && alert.delivery.total > 0
              ? `SMS: ${alert.delivery.sent}/${alert.delivery.total} sent`
              : alert.delivery.sent > 0
              ? `SMS: ${alert.delivery.sent}/${alert.delivery.total} sent`
              : 'SMS failed',
          type:
            alert.delivery.sent === alert.delivery.total && alert.delivery.total > 0
              ? 'success'
              : alert.delivery.sent > 0
              ? 'partial'
              : 'failure',
        } as SmsStatusFeedback)
      : undefined);

  if (compact) {
    return (
      <div
        className={`alert-queue-item ${isCritical ? 'item-critical' : isHigh ? 'item-high' : ''}`}
        onClick={() => onSelect && onSelect(alert)}
        role="button"
        tabIndex={0}
      >
        <div className="alert-queue-icon">
          {isCritical ? (
            <ShieldAlert size={18} className="text-critical" />
          ) : (
            <AlertTriangle size={18} className={isHigh ? 'text-high' : 'text-moderate'} />
          )}
        </div>

        <div className="alert-queue-content">
          <div className="alert-queue-header">
            <span className="alert-queue-code">{alert.alert_code}</span>
            <RiskBadge level={alert.alert_level} size="sm" />
            <span className={`badge badge-${alert.status.toLowerCase()}`}>{alert.status}</span>
          </div>

          <div className="alert-queue-title">{alert.title}</div>

          <div className="alert-queue-meta">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {alert.zone_name || alert.zone_code || `Zone #${alert.risk_zone_id}`}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeAgo(alert.created_at)}
            </span>
          </div>
        </div>

        <div className="alert-queue-actions" onClick={(e) => e.stopPropagation()}>
          {alert.status === 'ACTIVE' && onAcknowledge && (
            <button
              type="button"
              onClick={() => onAcknowledge(alert.id)}
              className="btn btn-xs btn-outline"
              title="Acknowledge Alert"
            >
              Ack
            </button>
          )}

          {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && onResolve && (
            <button
              type="button"
              onClick={() => onResolve(alert.id)}
              className="btn btn-xs btn-success"
              title="Resolve Alert"
            >
              Resolve
            </button>
          )}

          {onSendSms && (
            <button
              type="button"
              onClick={() => onSendSms(alert.id)}
              disabled={sendingSms}
              className="btn btn-xs btn-primary"
              title="Send SMS Broadcast"
            >
              {sendingSms ? <Loader2 size={12} className="spin-icon" /> : <Send size={12} />}
            </button>
          )}

          <ChevronRight size={16} className="text-muted ml-1" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`alert-card ${isCritical ? 'border-critical' : isHigh ? 'border-high' : ''}`}
      onClick={() => onSelect && onSelect(alert)}
    >
      <div className="alert-card-header">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="alert-card-code">{alert.alert_code}</span>
            <RiskBadge level={alert.alert_level} size="sm" />
            <span className={`badge badge-${alert.status.toLowerCase()}`}>{alert.status}</span>
          </div>
          <div className="alert-card-title">{alert.title}</div>
          <div className="alert-card-meta flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {alert.zone_name || alert.zone_code || `Zone #${alert.risk_zone_id}`}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(alert.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="alert-card-message">{alert.message}</div>

      {alert.reason && (
        <div className="alert-card-reason">
          <span className="font-medium text-navy">Operational trigger:</span> {alert.reason}
        </div>
      )}

      <div className="alert-card-actions">
        <div className="flex gap-2 items-center">
          {alert.status === 'ACTIVE' && onAcknowledge && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="btn btn-sm btn-warning"
            >
              Acknowledge
            </button>
          )}

          {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && onResolve && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(alert.id);
              }}
              className="btn btn-sm btn-success flex items-center gap-1"
            >
              <CheckCircle size={14} />
              Resolve
            </button>
          )}

          {onSendSms && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSendSms(alert.id);
              }}
              disabled={sendingSms}
              className="btn btn-sm btn-primary flex items-center gap-1"
            >
              {sendingSms ? (
                <>
                  <Loader2 size={14} className="spin-icon" />
                  Sending SMS...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Send SMS Broadcast
                </>
              )}
            </button>
          )}
        </div>

        {feedback && (
          <div className={`alert-feedback-pill feedback-${feedback.type}`}>
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
