/** Formatting helpers */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatMoisture(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return `${val.toFixed(1)}%`;
}

export function formatScore(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(2);
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${km.toFixed(1)} km`;
}

export function formatPopulation(pop: number): string {
  return pop.toLocaleString();
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}
