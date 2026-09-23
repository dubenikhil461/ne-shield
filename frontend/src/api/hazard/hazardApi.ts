import axios from "axios";
import type {
  HazardFeature,
  HazardFeatureCollection,
  DistrictSummary,
  BulletinSummary,
} from "./types";

const BASE = "/api/v1/hazard";

export async function fetchHazardZones(params?: {
  date?: string;
  refresh?: boolean;
  mock?: boolean;
}): Promise<HazardFeatureCollection> {
  const res = await axios.get<HazardFeatureCollection>(`${BASE}/zones`, {
    params,
  });
  return res.data;
}

export async function fetchHazardZone(
  settlementId: string,
  params?: { date?: string; refresh?: boolean; mock?: boolean }
): Promise<HazardFeature> {
  const res = await axios.get<HazardFeature>(`${BASE}/zones/${settlementId}`, {
    params,
  });
  return res.data;
}

export async function refreshSettlementWeather(
  settlementId: string,
  params?: { date?: string; mock?: boolean }
): Promise<HazardFeature> {
  const res = await axios.post<HazardFeature>(
    `${BASE}/zones/${settlementId}/refresh`,
    null,
    { params }
  );
  return res.data;
}

export async function fetchHazardDistricts(): Promise<DistrictSummary[]> {
  const res = await axios.get<DistrictSummary[]>(`${BASE}/districts`);
  return res.data;
}

export async function fetchHazardBulletin(params?: {
  date?: string;
  mock?: boolean;
}): Promise<BulletinSummary> {
  const res = await axios.get<BulletinSummary>(`${BASE}/bulletin`, { params });
  return res.data;
}

export async function sendIoTMoistureReading(data: {
  settlement_id: string;
  moisture_percent: number;
  device_id?: string;
  susceptibility_offset?: number;
}): Promise<HazardFeature> {
  const res = await axios.post<HazardFeature>(`${BASE}/iot/reading`, data);
  return res.data;
}
