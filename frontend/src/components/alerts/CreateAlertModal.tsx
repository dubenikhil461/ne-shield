import { useState, useEffect } from 'react';
import { CheckCircle2, Zap, Info, X } from 'lucide-react';
import { useRiskCurrent } from '../../hooks/useRisk';
import { useCreateAlert } from '../../hooks/useAlerts';
import type { CreateAlertData } from '../../api/alertApi';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultZoneId?: number;
}

export default function CreateAlertModal({ open, onClose, defaultZoneId }: Props) {
  const { data: riskData } = useRiskCurrent();
  const createMut = useCreateAlert();

  const zones = riskData?.data || [];

  const [zoneId, setZoneId] = useState<number | ''>('');
  const [level, setLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [resultStatus, setResultStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResultStatus(null);
      const initialZone = defaultZoneId || (zones.length > 0 ? zones[0].zone_id : '');
      setZoneId(initialZone);
      const zoneObj = zones.find((z: { zone_id: number }) => z.zone_id === initialZone);
      const zCode = zoneObj?.zone_code || 'Zone';
      setTitle(`High Landslide Hazard Warning - ${zCode}`);
      setMessage(`Elevated landslide risk detected in ${zCode}. Personnel and residents should take precautionary action.`);
      setReason('Monsoon precipitation and heightened soil moisture levels.');
    }
  }, [open, defaultZoneId, zones.length]);

  const handleZoneChange = (newZoneId: number) => {
    setZoneId(newZoneId);
    const zoneObj = zones.find((z: { zone_id: number }) => z.zone_id === newZoneId);
    const zCode = zoneObj?.zone_code || 'Zone';
    setTitle(`${level} Landslide Hazard Warning - ${zCode}`);
  };

  const handleLevelChange = (newLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    setLevel(newLevel);
    const zoneObj = zones.find((z: { zone_id: number }) => z.zone_id === zoneId);
    const zCode = zoneObj?.zone_code || 'Zone';
    setTitle(`${newLevel} Landslide Hazard Warning - ${zCode}`);
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId) return;

    const payload: CreateAlertData = {
      risk_zone_id: Number(zoneId),
      alert_level: level,
      title: title.trim(),
      message: message.trim(),
      reason: reason.trim(),
    };

    try {
      const res = await createMut.mutateAsync(payload);
      const delivery = res.delivery;
      if (level === 'HIGH' || level === 'CRITICAL') {
        if (delivery && delivery.sent > 0) {
          setResultStatus(`Alert created successfully. SMS: ${delivery.sent}/${delivery.total} sent.`);
        } else if (delivery && delivery.failed && delivery.failed.length > 0) {
          setResultStatus(`Alert created, but SMS failed: ${delivery.failed[0]?.error || 'SMS error'}.`);
        } else {
          setResultStatus('Alert created. SMS dispatch evaluated.');
        }
      } else {
        setResultStatus(`Alert created. Level ${level} does not trigger automated SMS.`);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setResultStatus(`Error creating alert: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const willTriggerSms = level === 'HIGH' || level === 'CRITICAL';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3>Create Operational Alert</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {resultStatus ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#16a34a' }}>
              <CheckCircle2 size={18} />
              <span>Operation Completed</span>
            </div>
            <div style={{ color: '#334155', fontSize: 14 }}>{resultStatus}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Target Risk Zone</label>
              <select
                className="form-select"
                value={zoneId}
                onChange={(e) => handleZoneChange(Number(e.target.value))}
                required
              >
                <option value="">— Select Risk Zone —</option>
                {zones.map((z: { zone_id: number; zone_code: string; zone_name: string; risk_level: string }) => (
                  <option key={z.zone_id} value={z.zone_id}>
                    {z.zone_code} — {z.zone_name} [{z.risk_level}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Alert Severity Level</label>
              <select
                className="form-select"
                value={level}
                onChange={(e) => handleLevelChange(e.target.value as any)}
                required
              >
                <option value="LOW">LOW (Dashboard & WebSocket only)</option>
                <option value="MEDIUM">MEDIUM (Dashboard & WebSocket only)</option>
                <option value="HIGH">HIGH (Dashboard + SMS)</option>
                <option value="CRITICAL">CRITICAL (Dashboard + SMS)</option>
              </select>
            </div>

            {willTriggerSms ? (
              <div
                style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#92400e',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Zap size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Automated SMS Broadcast:</strong> Creating a {level} alert will immediately trigger an SMS broadcast to configured emergency recipients via TextBee.
                </span>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#475569',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Dashboard Only:</strong> Levels below HIGH update operational screens and WebSockets without dispatching SMS.
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Alert Title</label>
              <input
                className="form-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operational Message</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Underlying Reason / Trigger Factors</label>
              <input
                className="form-input"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Rapid moisture spike + unstable debris slope"
              />
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={onClose} className="btn btn-outline" disabled={createMut.isPending}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${level === 'CRITICAL' ? 'btn-danger' : 'btn-primary'}`}
                disabled={createMut.isPending || !zoneId}
              >
                {createMut.isPending ? 'Publishing & Sending...' : `Publish ${level} Alert`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
