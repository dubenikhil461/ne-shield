/**
 * NE-SHIELD Semantic Risk Palette:
 * SAFE     -> #15803D (Green)
 * LOW      -> #65A30D (Light Green)
 * MODERATE -> #D97706 (Amber)
 * HIGH     -> #EA580C (Orange)
 * CRITICAL -> #B91C1C (Deep Red)
 */

export function normalizeRiskLevel(level: string): 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  const norm = (level || '').toUpperCase().trim();
  if (norm === 'SAFE' || norm === 'NONE' || norm === 'GREEN') return 'SAFE';
  if (norm === 'LOW' || norm === 'LIGHT' || norm === 'MINOR') return 'LOW';
  if (norm === 'MODERATE' || norm === 'MEDIUM' || norm === 'MOD' || norm === 'YELLOW') return 'MODERATE';
  if (norm === 'HIGH' || norm === 'ORANGE') return 'HIGH';
  if (norm === 'CRITICAL' || norm === 'RED' || norm === 'SEVERE') return 'CRITICAL';
  return 'LOW';
}

export function riskColor(level: string): string {
  const norm = normalizeRiskLevel(level);
  switch (norm) {
    case 'SAFE':
      return '#15803D';
    case 'LOW':
      return '#65A30D';
    case 'MODERATE':
      return '#D97706';
    case 'HIGH':
      return '#EA580C';
    case 'CRITICAL':
      return '#B91C1C';
  }
}

export function riskBgColor(level: string): string {
  const norm = normalizeRiskLevel(level);
  switch (norm) {
    case 'SAFE':
      return '#DCFCE7';
    case 'LOW':
      return '#ECFCCB';
    case 'MODERATE':
      return '#FEF3C7';
    case 'HIGH':
      return '#FFEDD5';
    case 'CRITICAL':
      return '#FEE2E2';
  }
}

export function riskTextColor(level: string): string {
  const norm = normalizeRiskLevel(level);
  switch (norm) {
    case 'SAFE':
      return '#14532D';
    case 'LOW':
      return '#365314';
    case 'MODERATE':
      return '#78350F';
    case 'HIGH':
      return '#7C2D12';
    case 'CRITICAL':
      return '#7F1D1D';
  }
}

export function statusColor(status: string): string {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'ONLINE':
      return 'badge-online';
    case 'WARNING':
      return 'badge-warning';
    case 'OFFLINE':
      return 'badge-offline';
    default:
      return '';
  }
}

export function severityColor(sev: string): string {
  const norm = normalizeRiskLevel(sev);
  switch (norm) {
    case 'SAFE':
      return 'badge-safe';
    case 'LOW':
      return 'badge-low';
    case 'MODERATE':
      return 'badge-moderate';
    case 'HIGH':
      return 'badge-high';
    case 'CRITICAL':
      return 'badge-critical';
  }
}
