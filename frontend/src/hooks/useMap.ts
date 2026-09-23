import { useQuery } from '@tanstack/react-query';
import {
  fetchStudyAreaGeoJson,
  fetchRoadsGeoJson,
  fetchVillagesGeoJson,
  fetchSensorsGeoJson,
  fetchFieldReportsGeoJson,
} from '../api/mapApi';

export function useStudyAreaGeoJson() {
  return useQuery({
    queryKey: ['mapStudyArea'],
    queryFn: fetchStudyAreaGeoJson,
    staleTime: 60000,
  });
}

export function useRoadsGeoJson() {
  return useQuery({
    queryKey: ['mapRoads'],
    queryFn: fetchRoadsGeoJson,
    staleTime: 60000,
  });
}

export function useVillagesGeoJson() {
  return useQuery({
    queryKey: ['mapVillages'],
    queryFn: fetchVillagesGeoJson,
    staleTime: 60000,
  });
}

export function useSensorsGeoJson() {
  return useQuery({
    queryKey: ['mapSensors'],
    queryFn: fetchSensorsGeoJson,
    staleTime: 60000,
  });
}

export function useFieldReportsGeoJson() {
  return useQuery({
    queryKey: ['mapFieldReports'],
    queryFn: fetchFieldReportsGeoJson,
    staleTime: 60000,
  });
}
