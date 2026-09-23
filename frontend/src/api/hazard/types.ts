export type WarningLevel = "green" | "yellow" | "orange" | "red";
export type SusceptibilityTier = "low" | "moderate" | "high" | "critical";
export type TriggerState = "dry" | "wet" | "saturated";

export interface HazardZoneProperties {
  settlement_id: string;
  name: string;
  district: string;
  source: string;
  lon: number;
  lat: number;
  slope_deg: number;
  elevation_m: number;
  profile_curv: number;
  plan_curv: number;
  static_susceptibility: number;
  susceptibility_tier: SusceptibilityTier;
  rain_24h_mm: number;
  api15_mm: number | null;
  trigger_state: TriggerState;
  caine_exceedance: boolean;
  caine_threshold_24h_mm: number;
  warning_level: WarningLevel;
  explanation: string;
  target_date: string;
  fetched_at?: string;
  iot_moisture?: number | null;
  is_iot_monitored: boolean;
}

export interface HazardFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: HazardZoneProperties;
}

export interface HazardFeatureCollection {
  type: "FeatureCollection";
  features: HazardFeature[];
  metadata: {
    target_date: string;
    generated_at: string;
    total_settlements: number;
    summary: Record<WarningLevel, number>;
    architecture: string;
    iot_monitored_settlements?: string[];
  };
}

export interface DistrictSummary {
  district: string;
  state: string;
  terrain_type: string;
  settlement_count: number;
  mean_slope_deg: number;
  mean_elevation_m: number;
  critical_susceptibility_count: number;
  high_susceptibility_count: number;
  moderate_susceptibility_count: number;
  low_susceptibility_count: number;
}

export interface BulletinSummary {
  target_date: string;
  total_settlements: number;
  warning_breakdown: Record<WarningLevel, number>;
  active_warnings: number;
  iot_monitored_settlements: string[];
  generated_at: string;
}
