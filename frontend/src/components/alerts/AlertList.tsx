import type { Alert } from '../../api/alertApi';
import AlertCard from './AlertCard';
import EmptyState from '../common/EmptyState';
import { Bell } from 'lucide-react';

interface Props {
  alerts: Alert[];
  onAcknowledge?: (id: number) => void;
  onResolve?: (id: number) => void;
  onSelect?: (alert: Alert) => void;
}

export default function AlertList({ alerts, onAcknowledge, onResolve, onSelect }: Props) {
  if (!alerts.length) {
    return <EmptyState message="No alerts to display" icon={<Bell size={32} />} />;
  }
  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={onAcknowledge}
          onResolve={onResolve}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
