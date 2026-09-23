import { useQuery } from '@tanstack/react-query';
import { fetchRiskCurrent, fetchRiskZone } from '../api/riskApi';

export function useRiskCurrent() {
  return useQuery({
    queryKey: ['riskCurrent'],
    queryFn: fetchRiskCurrent,
    refetchInterval: 30000,
  });
}

export function useRiskZone(zoneId: number | null) {
  return useQuery({
    queryKey: ['riskZone', zoneId],
    queryFn: () => fetchRiskZone(zoneId!),
    enabled: !!zoneId,
  });
}
