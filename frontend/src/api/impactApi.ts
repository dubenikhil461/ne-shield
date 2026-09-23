import client from './client';

export interface AffectedRoad {
  id: number;
  road_name: string;
  road_type: string;
  status: string;
  distance_km: number | null;
}

export interface AffectedVillage {
  id: number;
  name: string;
  population: number;
  latitude: number;
  longitude: number;
  distance_km: number | null;
}

export interface ZoneImpact {
  zone_id: number;
  zone_code: string;
  zone_name: string;
  risk_level: string;
  affected_roads: AffectedRoad[];
  potentially_affected_villages: AffectedVillage[];
  alternative_routes_available: boolean;
  total_road_length_at_risk_km: number;
  total_population_at_risk: number;
}

export async function fetchZoneImpact(zoneId: number) {
  const res = await client.get(`/impact/zones/${zoneId}`);
  return res.data;
}

export async function fetchRoads() {
  const res = await client.get('/impact/roads');
  return res.data;
}

export async function fetchVillages() {
  const res = await client.get('/impact/villages');
  return res.data;
}
