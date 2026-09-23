import { statusColor } from '../../utils/risk';

export default function SensorStatus({ status }: { status: string }) {
  const cls = statusColor(status);
  return <span className={`badge ${cls}`}>{status}</span>;
}
