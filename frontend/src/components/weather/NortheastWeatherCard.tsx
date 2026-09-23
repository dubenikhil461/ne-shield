import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  CloudDrizzle,
  Wind,
  Droplets,
  Eye,
  CloudRainWind,
  RefreshCw,
  MapPin,
  Clock,
  Radio,
} from 'lucide-react';
import {
  fetchStateWeather,
  NORTHEAST_STATES,
  type RealWeatherData,
  mapWeatherCode,
} from '../../services/weatherService';

interface NortheastWeatherCardProps {
  onStateChange?: (stateId: string) => void;
}

function getWeatherIcon(iconName: string, size = 28) {
  switch (iconName) {
    case 'Sun':
      return <Sun size={size} className="text-amber" />;
    case 'CloudSun':
      return <CloudSun size={size} className="text-amber" />;
    case 'Cloud':
      return <Cloud size={size} className="text-secondary" />;
    case 'CloudFog':
      return <CloudFog size={size} className="text-secondary" />;
    case 'CloudDrizzle':
      return <CloudDrizzle size={size} className="text-teal" />;
    case 'CloudSnow':
      return <CloudSnow size={size} className="text-blue" />;
    case 'CloudRain':
      return <CloudRain size={size} className="text-blue" />;
    case 'CloudLightning':
      return <CloudLightning size={size} className="text-amber" />;
    default:
      return <CloudRainWind size={size} className="text-teal" />;
  }
}

export default function NortheastWeatherCard({ onStateChange }: NortheastWeatherCardProps) {
  const [selectedStateId, setSelectedStateId] = useState<string>('arunachal_pradesh');

  const {
    data: weather,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<RealWeatherData>({
    queryKey: ['openMeteoWeather', selectedStateId],
    queryFn: () => fetchStateWeather(selectedStateId),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStateId = e.target.value;
    setSelectedStateId(newStateId);
    if (onStateChange) {
      onStateChange(newStateId);
    }
  };

  return (
    <div className="card weather-card">
      <div className="card-header weather-card-header">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-teal" />
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
            Weather & Hydrometeorology
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="form-select weather-state-select"
            value={selectedStateId}
            onChange={handleStateSelect}
            aria-label="Select Northeast State"
          >
            {NORTHEAST_STATES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.capital})
              </option>
            ))}
          </select>

          <button
            type="button"
            className="weather-refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Live Weather from Open-Meteo"
          >
            <RefreshCw size={14} className={isFetching ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="weather-loading-skeleton">
          <div className="skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton-box" style={{ height: 60 }} />
          <div className="skeleton-grid-4" />
        </div>
      ) : isError ? (
        <div className="weather-error-state" style={{ padding: 16 }}>
          <p className="text-sm text-danger font-medium">
            Weather telemetry temporarily unavailable for this coordinate.
          </p>
          <p className="text-xs text-muted mt-1">
            {error instanceof Error ? error.message : 'Network error with Open-Meteo API'}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline mt-3"
            onClick={() => refetch()}
          >
            Retry Sensor Telemetry
          </button>
        </div>
      ) : weather ? (
        <div className="weather-body">
          {/* Main Weather Metric Block */}
          <div className="weather-main-row">
            <div className="weather-temp-block">
              <div className="weather-icon-wrapper">
                {getWeatherIcon(mapWeatherCode(weather.weatherCode).icon, 32)}
              </div>
              <div>
                <div className="weather-temperature">
                  {weather.temperature}
                  <span className="weather-unit">°C</span>
                </div>
                <div className="weather-condition-label">
                  {weather.weatherLabel}
                </div>
              </div>
            </div>

            <div className="weather-location-pill">
              <MapPin size={13} className="text-teal" />
              <span>
                {weather.state.capital}, {weather.state.name}
              </span>
            </div>
          </div>

          {/* Operational Environmental Grid */}
          <div className="weather-metrics-grid">
            <div className="weather-metric-item">
              <div className="weather-metric-header">
                <CloudRain size={14} className="text-blue" />
                <span>Precipitation</span>
              </div>
              <div className="weather-metric-val">
                {weather.precipitation} <span className="weather-sub-unit">mm/hr</span>
              </div>
              <div className="weather-metric-status">
                {weather.rain > 0 ? `${weather.rain}mm rain recorded` : 'No active rainfall'}
              </div>
            </div>

            <div className="weather-metric-item">
              <div className="weather-metric-header">
                <Droplets size={14} className="text-teal" />
                <span>Relative Humidity</span>
              </div>
              <div className="weather-metric-val">
                {weather.humidity}<span className="weather-sub-unit">%</span>
              </div>
              <div className="weather-metric-status">
                {weather.humidity > 80 ? 'High soil saturation' : 'Moderate moisture'}
              </div>
            </div>

            <div className="weather-metric-item">
              <div className="weather-metric-header">
                <Wind size={14} className="text-slate" />
                <span>Surface Wind</span>
              </div>
              <div className="weather-metric-val">
                {weather.windSpeed} <span className="weather-sub-unit">km/h</span>
              </div>
              <div className="weather-metric-status">
                10m anemometer reading
              </div>
            </div>

            <div className="weather-metric-item">
              <div className="weather-metric-header">
                <Eye size={14} className="text-amber" />
                <span>Visibility</span>
              </div>
              <div className="weather-metric-val">
                {weather.visibility} <span className="weather-sub-unit">km</span>
              </div>
              <div className="weather-metric-status">
                {weather.precipitationProbability > 0
                  ? `${weather.precipitationProbability}% precip probability`
                  : 'Clear visual corridor'}
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="weather-footer">
            <div className="weather-source-badge">
              <span className="weather-source-dot" />
              Source: {weather.source} (WMO Telemetry)
            </div>
            <div className="weather-forecast-time flex items-center gap-1">
              <Clock size={11} />
              <span>Forecast Ref: {weather.lastUpdated}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
