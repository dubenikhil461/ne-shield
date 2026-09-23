import client from './client';

export interface Alert {
  id: number;
  alert_code: string;
  risk_zone_id: number;
  alert_level: string;
  title: string;
  message: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  zone_name: string | null;
  zone_code: string | null;
  delivery?: {
    total: number;
    sent: number;
    failed: any[];
    error?: string;
  };
}

export interface CreateAlertData {
  risk_zone_id: number;
  alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  reason?: string;
}

export interface NotificationRecipient {
  name: string;
  phone_number: string;
}

export interface NotificationStatus {
  sms_enabled: boolean;
  textbee_configured: boolean;
  recipient_count: number;
  recipients: NotificationRecipient[];
}

export interface SmsDeliveryResult {
  success: boolean;
  alert_code?: string;
  delivery: {
    total: number;
    sent: number;
    failed: any[];
    details?: any[];
    error?: string;
  };
}

export async function fetchAlerts(params?: {
  status?: string;
  alert_level?: string;
  page?: number;
  page_size?: number;
}) {
  const res = await client.get('/alerts', { params });
  return res.data;
}

export async function fetchAlert(id: number) {
  const res = await client.get(`/alerts/${id}`);
  return res.data;
}

export async function createAlert(data: CreateAlertData): Promise<Alert> {
  const res = await client.post('/alerts', data);
  return res.data;
}

export async function sendAlertSms(id: number): Promise<SmsDeliveryResult> {
  const res = await client.post(`/alerts/${id}/send-sms`);
  return res.data;
}

export async function fetchNotificationStatus(): Promise<NotificationStatus> {
  const res = await client.get('/alerts/notifications/status');
  return res.data;
}

export async function sendTestSms(): Promise<SmsDeliveryResult> {
  const res = await client.post('/alerts/notifications/test-sms');
  return res.data;
}

export async function acknowledgeAlert(id: number) {
  const res = await client.post(`/alerts/${id}/acknowledge`);
  return res.data;
}

export async function resolveAlert(id: number) {
  const res = await client.post(`/alerts/${id}/resolve`);
  return res.data;
}
