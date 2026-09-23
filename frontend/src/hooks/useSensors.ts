import { useQuery } from '@tanstack/react-query';
import { fetchSensors, fetchSensor, fetchSensorReadings } from '../api/sensorApi';

export function useSensors(params?: { sensor_type?: string; status?: string }) {
  return useQuery({
    queryKey: ['sensors', params],
    queryFn: () => fetchSensors(params),
    refetchInterval: 30000,
  });
}

export function useSensor(id: number | null) {
  return useQuery({
    queryKey: ['sensor', id],
    queryFn: () => fetchSensor(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useSensorReadings(
  sensorId: number | null,
  params?: { hours?: number; page?: number; page_size?: number }
) {
  return useQuery({
    queryKey: ['sensorReadings', sensorId, params],
    queryFn: () => fetchSensorReadings(sensorId!, params),
    enabled: !!sensorId,
  });
}
