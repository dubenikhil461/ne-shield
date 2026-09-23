/** Map utility helpers for MapLibre GL */
export function createMarkerEl(color: string, label?: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 12px; height: 12px; border-radius: 50%;
    background: ${color}; border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;
  if (label) el.title = label;
  return el;
}

export function riskToColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#ef4444';
    case 'MEDIUM': return '#f59e0b';
    case 'LOW': return '#22c55e';
    default: return '#6b7280';
  }
}

export function sensorToColor(status: string): string {
  switch (status) {
    case 'ONLINE': return '#22c55e';
    case 'WARNING': return '#f59e0b';
    case 'OFFLINE': return '#9ca3af';
    default: return '#6b7280';
  }
}
