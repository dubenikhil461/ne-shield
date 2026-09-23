import client from './client';

export interface RiskFactor {
  name: string;
  label: string;
  value: number;
  severity: string;
}

export interface RiskAssessment {
  zone_id: number;
  zone_code: string;
  zone_name: string;
  risk_level: string;
  risk_score: number;
  susceptibility_score: number;
  current_moisture: number | null;
  moisture_trend: number | null;
  moisture_status: string | null;
  sensor_code: string | null;
  sensor_status: string | null;
  latest_reading_at: string | null;
  factors: RiskFactor[];
  updated_at: string;
}

export async function fetchRiskCurrent() {
  const res = await client.get('/risk/current');
  return res.data;
}

export async function fetchRiskZones() {
  const res = await client.get('/risk/zones');
  return res.data;
}

export async function fetchRiskZone(zoneId: number) {
  const res = await client.get(`/risk/zones/${zoneId}`);
  return res.data;
}

export async function fetchZoneHistory(zoneId: number) {
  const res = await client.get(`/risk/zones/${zoneId}/history`);
  return res.data;
}
