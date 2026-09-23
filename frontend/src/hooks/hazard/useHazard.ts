import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchHazardZones,
  fetchHazardZone,
  refreshSettlementWeather,
  fetchHazardDistricts,
  fetchHazardBulletin,
  sendIoTMoistureReading,
} from "../../api/hazard/hazardApi";

export function useHazardZones(params?: {
  date?: string;
  mock?: boolean;
}) {
  return useQuery({
    queryKey: ["hazardZones", params],
    queryFn: () => fetchHazardZones(params),
    staleTime: 60000,
    retry: 1,
  });
}

export function useHazardZone(settlementId: string | null) {
  return useQuery({
    queryKey: ["hazardZone", settlementId],
    queryFn: () => fetchHazardZone(settlementId!),
    enabled: !!settlementId,
  });
}

export function useHazardDistricts() {
  return useQuery({
    queryKey: ["hazardDistricts"],
    queryFn: fetchHazardDistricts,
    staleTime: 300000,
  });
}

export function useHazardBulletin(params?: { date?: string; mock?: boolean }) {
  return useQuery({
    queryKey: ["hazardBulletin", params],
    queryFn: () => fetchHazardBulletin(params),
    staleTime: 60000,
  });
}

export function useRefreshSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      settlementId,
      params,
    }: {
      settlementId: string;
      params?: { date?: string; mock?: boolean };
    }) => refreshSettlementWeather(settlementId, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hazardZones"] });
    },
  });
}

export function useIoTMoistureReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendIoTMoistureReading,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hazardZones"] });
    },
  });
}
