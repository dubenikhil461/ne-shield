import client from './client';

export interface Sensor {
  id: number;
  sensor_code: string;
  name: string;
  sensor_type: string;
  latitude: number;
  longitude: number;
  status: string;
  last_seen_at: string | null;
  battery_level: number | null;
  current_moisture: number | null;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: number;
  sensor_id: number;
  timestamp: string;
  moisture_percent: number | null;
  raw_value: number | null;
  battery_level: number | null;
  quality: string;
  created_at: string;
}

export async function fetchSensors(params?: { sensor_type?: string; status?: string }) {
  const res = await client.get('/sensors', { params });
  return res.data;
}

export async function fetchSensor(id: number) {
  const res = await client.get(`/sensors/${id}`);
  return res.data;
}

export async function createSensor(data: {
  sensor_code: string;
  name: string;
  sensor_type?: string;
  latitude: number;
  longitude: number;
}) {
  const res = await client.post('/sensors', data);
  return res.data;
}

export async function updateSensor(id: number, data: Record<string, unknown>) {
  const res = await client.patch(`/sensors/${id}`, data);
  return res.data;
}

export async function fetchSensorReadings(
  sensorId: number,
  params?: { hours?: number; page?: number; page_size?: number }
) {
  const res = await client.get(`/sensors/${sensorId}/readings`, { params });
  return res.data;
}
