import type { Sensor } from '../../api/sensorApi';
import { formatMoisture, timeAgo } from '../../utils/formatters';
import SensorStatus from './SensorStatus';
import LiveIndicator from './LiveIndicator';

interface Props {
  sensor: Sensor;
  selected?: boolean;
  onClick?: () => void;
}

export default function SensorCard({ sensor, selected, onClick }: Props) {
  return (
    <div className={`sensor-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="sensor-card-header">
        <div>
          <div className="sensor-code">{sensor.sensor_code}</div>
          <div className="sensor-name">{sensor.name}</div>
        </div>
        <SensorStatus status={sensor.status} />
      </div>
      <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
        <div className="sensor-moisture">
          {sensor.current_moisture !== null ? (
            <>
              <LiveIndicator />
              {formatMoisture(sensor.current_moisture)}
            </>
          ) : (
            <span className="text-muted">No data</span>
          )}
        </div>
      </div>
      <div className="sensor-meta">
        <span>Battery: {sensor.battery_level ?? '—'}%</span>
        <span>Last seen: {timeAgo(sensor.last_seen_at)}</span>
      </div>
    </div>
  );
}
