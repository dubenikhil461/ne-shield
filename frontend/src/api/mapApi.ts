import client from './client';

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export async function fetchStudyAreaGeoJson() {
  const res = await client.get<GeoJsonFeatureCollection>('/maps/study-area');
  return res.data;
}

export async function fetchRoadsGeoJson() {
  const res = await client.get<GeoJsonFeatureCollection>('/maps/roads');
  return res.data;
}

export async function fetchVillagesGeoJson() {
  const res = await client.get<GeoJsonFeatureCollection>('/maps/villages');
  return res.data;
}

export async function fetchSensorsGeoJson() {
  const res = await client.get<GeoJsonFeatureCollection>('/maps/sensors');
  return res.data;
}

export async function fetchFieldReportsGeoJson() {
  const res = await client.get<GeoJsonFeatureCollection>('/maps/field-reports');
  return res.data;
}
