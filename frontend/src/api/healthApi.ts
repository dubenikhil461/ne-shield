import client from './client';

export async function fetchHealth() {
  const res = await client.get('/health');
  return res.data;
}

export async function fetchSystemStatus() {
  const res = await client.get('/health/status');
  return res.data;
}
