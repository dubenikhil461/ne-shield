import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAlerts,
  acknowledgeAlert,
  resolveAlert,
  createAlert,
  sendAlertSms,
  fetchNotificationStatus,
  sendTestSms,
  type CreateAlertData,
} from '../api/alertApi';

export function useAlerts(params?: { status?: string; alert_level?: string }) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => fetchAlerts(params),
    refetchInterval: 15000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertData) => createAlert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['riskCurrent'] });
      qc.invalidateQueries({ queryKey: ['systemStatus'] });
    },
  });
}

export function useSendAlertSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sendAlertSms(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['notificationStatus'] });
    },
  });
}

export function useNotificationStatus() {
  return useQuery({
    queryKey: ['notificationStatus'],
    queryFn: fetchNotificationStatus,
    refetchInterval: 15000,
  });
}

export function useSendTestSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendTestSms,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificationStatus'] });
      qc.invalidateQueries({ queryKey: ['systemStatus'] });
    },
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => acknowledgeAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
