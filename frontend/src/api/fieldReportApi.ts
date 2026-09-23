import client from './client';

export interface ReportLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt?: string;
}

export interface ReportImage {
  fileId?: string;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  _id?: string;
}

export type IncidentType =
  | 'LANDSLIDE'
  | 'VISIBLE_CRACK'
  | 'ROAD_BLOCKAGE'
  | 'ROCKFALL'
  | 'FLOODING'
  | 'OTHER_HAZARD';

export type ReportSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'VALIDATED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface CrowdReport {
  _id: string;
  referenceId: string;
  localId?: string;
  reporterPhone?: string;
  incidentType: IncidentType;
  description: string;
  userSeverity: ReportSeverity;
  roadBlocked: boolean;
  peopleNearby: boolean;
  buildingsNearby: boolean;
  location: ReportLocation;
  images: ReportImage[];
  status: ReportStatus;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CrowdReportsResponse {
  success: boolean;
  count: number;
  data: CrowdReport[];
}

export function normalizeReport(r: any): CrowdReport {
  if (!r) {
    return {
      _id: '',
      referenceId: 'FR-UNKNOWN',
      incidentType: 'LANDSLIDE',
      description: '',
      userSeverity: 'MEDIUM',
      roadBlocked: false,
      peopleNearby: false,
      buildingsNearby: false,
      location: { latitude: 0, longitude: 0 },
      images: [],
      status: 'RECEIVED',
      createdAt: new Date().toISOString(),
    };
  }

  const description = r.description || '';
  let inferredType: IncidentType = 'LANDSLIDE';
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('crack')) inferredType = 'VISIBLE_CRACK';
  else if (lowerDesc.includes('block') || lowerDesc.includes('debris') || lowerDesc.includes('road')) inferredType = 'ROAD_BLOCKAGE';
  else if (lowerDesc.includes('rock') || lowerDesc.includes('fall')) inferredType = 'ROCKFALL';
  else if (lowerDesc.includes('flood') || lowerDesc.includes('water')) inferredType = 'FLOODING';

  return {
    _id: String(r._id || r.id || r.referenceId || ''),
    referenceId: r.referenceId || r.report_code || (r.id ? `FR-${r.id}` : 'FR-DEMO'),
    localId: r.localId,
    reporterPhone: r.reporterPhone,
    incidentType: r.incidentType || inferredType,
    description: description,
    userSeverity: (r.userSeverity || r.severity || 'MEDIUM').toUpperCase() as ReportSeverity,
    roadBlocked: r.roadBlocked ?? (lowerDesc.includes('road') && (lowerDesc.includes('block') || lowerDesc.includes('debris'))),
    peopleNearby: r.peopleNearby ?? false,
    buildingsNearby: r.buildingsNearby ?? false,
    location: r.location || {
      latitude: Number(r.latitude) || 0,
      longitude: Number(r.longitude) || 0,
      accuracy: r.accuracy,
      capturedAt: r.capturedAt,
    },
    images: r.images || (r.photo_url ? [{ url: r.photo_url }] : []),
    status: (r.status === 'VERIFIED' ? 'VALIDATED' : r.status) || 'RECEIVED',
    source: r.source || 'PWA',
    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
    updatedAt: r.updatedAt || r.updated_at,
  };
}

export async function fetchFieldReports(params?: {
  status?: string;
  limit?: number;
}): Promise<CrowdReportsResponse> {
  const res = await client.get<any>('/field-reports', { params });
  const raw = res.data;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : [];
  const normalized = list.map(normalizeReport);
  return {
    success: true,
    count: normalized.length,
    data: normalized,
  };
}

export async function fetchFieldReport(id: string): Promise<{ success: boolean; data: CrowdReport }> {
  const res = await client.get<any>(`/field-reports/${id}`);
  const raw = res.data?.data || res.data;
  return {
    success: true,
    data: normalizeReport(raw),
  };
}

export async function updateFieldReportStatus(
  id: string,
  status: ReportStatus
): Promise<{ success: boolean; data: CrowdReport; message: string }> {
  const res = await client.patch(`/field-reports/${id}/status`, { status });
  const raw = res.data?.data || res.data;
  return {
    success: true,
    data: normalizeReport(raw),
    message: res.data?.message || 'Status updated',
  };
}
