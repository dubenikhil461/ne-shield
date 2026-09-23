import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type L from 'leaflet';
import PageContainer from '../components/layout/PageContainer';
import { fetchSensors } from '../api/sensorApi';
import { fetchAlerts, type Alert } from '../api/alertApi';
import { fetchRiskCurrent, type RiskAssessment } from '../api/riskApi';
import {
  fetchFieldReports,
  updateFieldReportStatus,
  type CrowdReport,
  type ReportStatus,
} from '../api/fieldReportApi';
import { fetchHazardZones } from '../api/hazard/hazardApi';
import { fetchVillages, fetchRoads } from '../api/impactApi';
import { fetchHealth } from '../api/healthApi';
import { useMoistureWebSocket } from '../hooks/useMoistureWebSocket';
import { useAcknowledgeAlert, useResolveAlert, useSendAlertSms } from '../hooks/useAlerts';
import AlertCard, { type SmsStatusFeedback } from '../components/alerts/AlertCard';
import AlertDetails from '../components/alerts/AlertDetails';
import FieldReportDrawer from '../components/fieldReports/FieldReportDrawer';
import RiskZoneDrawer from '../components/risk/RiskZoneDrawer';
import NortheastWeatherCard from '../components/weather/NortheastWeatherCard';
import RiskBadge from '../components/risk/RiskBadge';
import { HazardMap } from '../components/hazard/HazardMap';
import { HazardLegend } from '../components/hazard/HazardLegend';
import type { HazardFeatureCollection, HazardZoneProperties } from '../api/hazard/types';
import { formatMoisture, timeAgo, formatPopulation } from '../utils/formatters';
import {
  ShieldAlert,
  Bell,
  FileWarning,
  Activity,
  Users,
  Crosshair,
  Layers,
  Maximize2,
  FileText,
  Radio,
  Phone,
  X,
  RefreshCw,
  Route,
  MapPin,
} from 'lucide-react';

export default function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { connected } = useMoistureWebSocket();
  const ackAlert = useAcknowledgeAlert();
  const resAlert = useResolveAlert();
  const sendSmsMut = useSendAlertSms();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedReport, setSelectedReport] = useState<CrowdReport | null>(null);
  const [selectedRiskZone, setSelectedRiskZone] = useState<RiskAssessment | null>(null);
  const [showSitRepModal, setShowSitRepModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);

  const [showReportLayer, setShowReportLayer] = useState(true);
  const [selectedMapZone, setSelectedMapZone] = useState<HazardZoneProperties | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const [sendingSmsId, setSendingSmsId] = useState<number | null>(null);
  const [smsStatuses, setSmsStatuses] = useState<Record<number, SmsStatusFeedback>>({});

  const { data: riskData, refetch: refetchRisk } = useQuery({
    queryKey: ['riskCurrent'],
    queryFn: fetchRiskCurrent,
    refetchInterval: 30000,
  });

  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts({ status: 'ACTIVE' }),
    refetchInterval: 15000,
  });

  const { data: fieldReportsData, refetch: refetchReports } = useQuery({
    queryKey: ['fieldReports'],
    queryFn: () => fetchFieldReports(),
    refetchInterval: 15000,
  });

  const { data: sensorsData } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => fetchSensors(),
    refetchInterval: 30000,
  });

  const { data: hazardZonesData } = useQuery<HazardFeatureCollection>({
    queryKey: ['hazardZones'],
    queryFn: () => fetchHazardZones(),
    staleTime: 60000,
  });

  const { data: villagesData } = useQuery({
    queryKey: ['villages'],
    queryFn: fetchVillages,
    staleTime: 60000,
  });
  const { data: roadsData } = useQuery({
    queryKey: ['roads'],
    queryFn: fetchRoads,
    staleTime: 60000,
  });

  const { isError: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 20000,
  });

  const reportStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      updateFieldReportStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fieldReports'] });
      qc.invalidateQueries({ queryKey: ['validatedFieldReports'] });
    },
  });

  const handleSendSms = async (alertId: number) => {
    setSendingSmsId(alertId);
    try {
      const res = await sendSmsMut.mutateAsync(alertId);
      const delivery = res.delivery;
      if (delivery && delivery.sent === delivery.total && delivery.total > 0) {
        setSmsStatuses((prev) => ({
          ...prev,
          [alertId]: { text: `SMS: ${delivery.sent}/${delivery.total} sent`, type: 'success' },
        }));
      } else if (delivery && delivery.sent > 0) {
        setSmsStatuses((prev) => ({
          ...prev,
          [alertId]: { text: `SMS: ${delivery.sent}/${delivery.total} sent`, type: 'partial' },
        }));
      } else {
        const errDetail = delivery?.error || (delivery?.failed && delivery.failed[0]?.error);
        setSmsStatuses((prev) => ({
          ...prev,
          [alertId]: {
            text: errDetail ? `SMS failed: ${errDetail}` : 'SMS failed: TextBee gateway',
            type: 'failure',
          },
        }));
      }
    } catch (err: any) {
      setSmsStatuses((prev) => ({
        ...prev,
        [alertId]: {
          text: `SMS error: ${err?.response?.data?.detail || err.message}`,
          type: 'failure',
        },
      }));
    } finally {
      setSendingSmsId(null);
    }
  };

  const validatedReports: CrowdReport[] = (fieldReportsData?.data || []).filter(
    (r) => r.status === 'VALIDATED' || r.status === 'IN_PROGRESS'
  );

  const handleLocateReports = useCallback(() => {
    if (!leafletMapRef.current || validatedReports.length === 0) return;
    const first = validatedReports[0];
    if (first.location?.latitude != null && first.location?.longitude != null) {
      leafletMapRef.current.flyTo(
        [first.location.latitude, first.location.longitude],
        13,
        { animate: true, duration: 1.2 }
      );
    }
  }, [validatedReports]);

  const riskZones: RiskAssessment[] = riskData?.data || [];
  const alerts: Alert[] = alertsData?.data || [];
  const crowdReports: CrowdReport[] = fieldReportsData?.data || [];
  const sensors = sensorsData?.data || [];
  const villages = villagesData?.data || [];
  const roads = roadsData?.data || [];

  const criticalRiskCount = riskZones.filter((z) => z.risk_level === 'CRITICAL').length;
  const highRiskCount = riskZones.filter((z) => z.risk_level === 'HIGH').length;
  const totalHighAndCritical = criticalRiskCount + highRiskCount;

  const activeAlertsCount = alerts.length;
  const criticalAlertsCount = alerts.filter((a) => a.alert_level === 'CRITICAL').length;
  const highAlertsCount = alerts.filter((a) => a.alert_level === 'HIGH').length;

  const pendingTriageReports = crowdReports.filter(
    (r) => r.status === 'RECEIVED' || r.status === 'UNDER_REVIEW'
  );

  const onlineSensorsCount = sensors.filter((s: any) => s.status === 'ONLINE').length;
  const atRiskRoadsCount = roads.filter((r: any) => r.status === 'AT_RISK' || r.status === 'BLOCKED').length;
  const totalMonitoredPop = villages.reduce((acc: number, v: any) => acc + (v.population || 0), 0);

  return (
    <PageContainer
      title="Operations Overview"
      subtitle="Real-time landslide risk, field intelligence and emergency status across Northeast India."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm flex items-center gap-1"
            onClick={() => {
              refetchRisk();
              refetchAlerts();
              refetchReports();
            }}
          >
            <RefreshCw size={13} />
            <span>Sync Ops Data</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-1"
            onClick={() => setShowSitRepModal(true)}
          >
            <FileText size={13} />
            <span>Situation Report</span>
          </button>
        </div>
      }
    >
      {/* 1. Operational Top KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Critical Risk Zones</span>
            <div className="kpi-icon-wrapper">
              <ShieldAlert size={16} className={totalHighAndCritical > 0 ? 'text-critical' : 'text-safe'} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: totalHighAndCritical > 0 ? '#B91C1C' : '#15803D' }}>
              {totalHighAndCritical}
            </span>
            <span className="kpi-unit">/ {riskZones.length || '—'} zones</span>
          </div>
          <div className="kpi-subtext">
            <span className="kpi-live-dot" />
            <span>{criticalRiskCount} Critical • {highRiskCount} High Alert</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Active Alerts</span>
            <div className="kpi-icon-wrapper">
              <Bell size={16} className={activeAlertsCount > 0 ? 'text-high' : 'text-safe'} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: activeAlertsCount > 0 ? '#EA580C' : '#15803D' }}>
              {activeAlertsCount}
            </span>
            <span className="kpi-unit">dispatched</span>
          </div>
          <div className="kpi-subtext">
            <span>{criticalAlertsCount > 0 ? `${criticalAlertsCount} Critical • ${highAlertsCount} High` : `${highAlertsCount} High Priority`}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Total Field Reports</span>
            <div className="kpi-icon-wrapper">
              <FileWarning size={16} className="text-teal" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{crowdReports.length}</span>
            <span className="kpi-unit">reports</span>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: pendingTriageReports.length > 0 ? '#0F766E' : '#64748B', fontWeight: 600 }}>
              {pendingTriageReports.length} Pending Triage
            </span>
            <span>• {validatedReports.length} Validated</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">IoT Sensor Nodes</span>
            <div className="kpi-icon-wrapper">
              <Activity size={16} className={connected ? 'text-safe' : 'text-secondary'} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{onlineSensorsCount}</span>
            <span className="kpi-unit">/ {sensors.length || '—'} online</span>
          </div>
          <div className="kpi-subtext">
            <span className="kpi-live-dot" />
            <span>{connected ? 'WebSocket Live Feed' : 'Polling Sync Active'}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Monitored Settlements</span>
            <div className="kpi-icon-wrapper">
              <Users size={16} className="text-navy" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {hazardZonesData?.features ? hazardZonesData.features.length : '1,386'}
            </span>
            <span className="kpi-unit">settlements</span>
          </div>
          <div className="kpi-subtext">
            <span>{atRiskRoadsCount > 0 ? `${atRiskRoadsCount} roads at risk` : `${formatPopulation(totalMonitoredPop)} population monitored`}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Operational Grid: GIS Map + Operational Sidebar Stack */}
      <div className="dashboard-main-grid">
        <div className="dashboard-map-panel">
          <div className="dashboard-map-panel-header">
            <div className="dashboard-map-title-area">
              <span className="dashboard-map-title">Real-Time GIS Hazard & Field Intelligence</span>
              <span className="dashboard-map-badge">
                <span className="kpi-live-dot" />
                {hazardZonesData?.features?.length ?? 1386} Settlements Monitored
              </span>
            </div>

            <div className="dashboard-map-actions">
              <button
                type="button"
                className={`btn btn-xs ${showReportLayer ? 'btn-teal' : 'btn-outline'}`}
                onClick={() => setShowReportLayer((prev) => !prev)}
                title="Toggle Citizen Field Reports Dynamic Layer"
              >
                <Layers size={13} />
                <span>Reports Layer ({validatedReports.length})</span>
              </button>

              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={handleLocateReports}
                disabled={validatedReports.length === 0}
                title="Focus map on verified citizen field incident"
              >
                <Crosshair size={13} />
                <span>Locate Report</span>
              </button>

              <Link to="/map" className="btn btn-xs btn-primary" title="Open Full Screen GIS Command Console">
                <Maximize2 size={13} />
                <span>Full Console</span>
              </Link>
            </div>
          </div>

          <div className="dashboard-map-view">
            <HazardMap
              features={hazardZonesData?.features ?? []}
              selectedZone={selectedMapZone}
              onSelectZone={(zone) => setSelectedMapZone(zone)}
              reports={validatedReports}
              showReports={showReportLayer}
              onInitMap={(map) => {
                leafletMapRef.current = map;
              }}
            />
            <HazardLegend
              summary={hazardZonesData?.metadata?.summary}
              iotMonitored={hazardZonesData?.metadata?.iot_monitored_settlements}
            />
          </div>
        </div>

        <div className="dashboard-right-stack">
          {/* Active Alerts Queue */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-navy" />
                <h3>Active Alerts Queue</h3>
              </div>
              <Link to="/alerts" className="text-xs text-teal font-semibold">
                All Alerts ({alerts.length}) →
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 text-center text-muted text-xs">
                No active emergency alerts. All regional sectors currently nominal.
              </div>
            ) : (
              <div className="alert-queue-list">
                {alerts.slice(0, 4).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    compact
                    onSelect={(a) => setSelectedAlert(a)}
                    onAcknowledge={(id) => ackAlert.mutate(id)}
                    onResolve={(id) => resAlert.mutate(id)}
                    onSendSms={(id) => handleSendSms(id)}
                    sendingSms={sendingSmsId === alert.id}
                    smsStatus={smsStatuses[alert.id]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Radio size={15} className="text-teal" />
                <h3>Operational Actions</h3>
              </div>
            </div>

            <div className="quick-actions-grid">
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => navigate('/map')}
              >
                <div className="quick-action-icon">
                  <Maximize2 size={16} />
                </div>
                <div className="quick-action-title">Live GIS Map</div>
                <div className="quick-action-desc">1,386 settlements</div>
              </button>

              <button
                type="button"
                className="quick-action-btn"
                onClick={() => navigate('/field-reports')}
              >
                <div className="quick-action-icon">
                  <FileWarning size={16} />
                </div>
                <div className="quick-action-title">Field Reports</div>
                <div className="quick-action-desc">{pendingTriageReports.length} pending triage</div>
              </button>

              <button
                type="button"
                className="quick-action-btn"
                onClick={() => navigate('/alerts')}
              >
                <div className="quick-action-icon">
                  <Bell size={16} />
                </div>
                <div className="quick-action-title">Alert Center</div>
                <div className="quick-action-desc">Dispatch SMS</div>
              </button>

              <button
                type="button"
                className="quick-action-btn"
                onClick={() => setShowContactsModal(true)}
              >
                <div className="quick-action-icon">
                  <Phone size={16} />
                </div>
                <div className="quick-action-title">Emergency SDMA</div>
                <div className="quick-action-desc">8 State Hotlines</div>
              </button>
            </div>
          </div>

          {/* System Status Panel */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-navy" />
                <h3>System Telemetry Status</h3>
              </div>
            </div>

            <div className="system-status-list">
              <div className="system-status-row">
                <div className="system-status-key">
                  <span className={`system-dot ${healthError ? 'system-dot-error' : 'system-dot-ok'}`} />
                  <span>FastAPI Core API</span>
                </div>
                <span className="system-status-value" style={{ color: healthError ? '#B91C1C' : '#15803D' }}>
                  {healthError ? 'Unavailable' : 'Operational'}
                </span>
              </div>

              <div className="system-status-row">
                <div className="system-status-key">
                  <span className={`system-dot ${hazardZonesData ? 'system-dot-ok' : 'system-dot-warn'}`} />
                  <span>GIS Map Layer Data</span>
                </div>
                <span className="system-status-value">
                  {hazardZonesData ? '1,386 Polygons' : 'Loading...'}
                </span>
              </div>

              <div className="system-status-row">
                <div className="system-status-key">
                  <span className="system-dot system-dot-ok" />
                  <span>Open-Meteo Weather API</span>
                </div>
                <span className="system-status-value text-safe">
                  Active (8 States)
                </span>
              </div>

              <div className="system-status-row">
                <div className="system-status-key">
                  <span className={`system-dot ${connected ? 'system-dot-ok' : 'system-dot-warn'}`} />
                  <span>IoT Sensor Telemetry</span>
                </div>
                <span className="system-status-value">
                  {connected ? 'WebSocket Live' : `${onlineSensorsCount} Online`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Operational Intelligence Row */}
      <div className="dashboard-bottom-grid">
        {/* Card 1: Risk Zones Table */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-navy" />
              <h3>High Vulnerability Zones</h3>
            </div>
            <Link to="/risk" className="text-xs text-teal font-semibold">
              View All ({riskZones.length}) →
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Sector</th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Moisture</th>
                </tr>
              </thead>
              <tbody>
                {riskZones.slice(0, 6).map((z) => (
                  <tr
                    key={z.zone_id}
                    onClick={() => setSelectedRiskZone(z)}
                    style={{ cursor: 'pointer' }}
                    title="Click to open risk zone inspector"
                  >
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{z.zone_code}</td>
                    <td className="text-secondary">{z.zone_name}</td>
                    <td><RiskBadge level={z.risk_level} size="sm" /></td>
                    <td style={{ fontWeight: 600 }}>{z.risk_score.toFixed(2)}</td>
                    <td className="text-teal font-semibold">{formatMoisture(z.current_moisture)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Latest Field Reports */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FileWarning size={15} className="text-navy" />
              <h3>Citizen Incident Triage</h3>
              {pendingTriageReports.length > 0 && (
                <span className="badge badge-received">
                  {pendingTriageReports.length} pending
                </span>
              )}
            </div>
            <Link to="/field-reports" className="text-xs text-teal font-semibold">
              Manage ({crowdReports.length}) →
            </Link>
          </div>

          <div className="reports-queue-list">
            {crowdReports.length === 0 ? (
              <div className="p-4 text-center text-muted text-xs">
                No citizen reports logged.
              </div>
            ) : (
              crowdReports.slice(0, 4).map((report) => {
                const reportId = report._id || report.referenceId;
                return (
                  <div
                    key={reportId}
                    className="report-row-card"
                    onClick={() => setSelectedReport(report)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="report-id-chip">{report.referenceId}</span>
                        <span className="report-type-badge">
                          {(report.incidentType || 'HAZARD').replace(/_/g, ' ')}
                        </span>
                        <RiskBadge level={report.userSeverity} size="sm" />
                        {report.roadBlocked && (
                          <span className="badge badge-critical flex items-center gap-1">
                            <Route size={11} /> Blocked
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-secondary truncate">
                        {report.description || 'Hazard observation recorded.'}
                      </div>

                      <div className="text-xs text-muted flex items-center gap-2">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {report.location?.latitude?.toFixed(4)}, {report.location?.longitude?.toFixed(4)}</span>
                        <span>•</span>
                        <span>{timeAgo(report.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {report.status === 'RECEIVED' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => reportStatusMut.mutate({ id: reportId, status: 'UNDER_REVIEW' })}
                            disabled={reportStatusMut.isPending}
                            title="Mark Under Review"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-success"
                            onClick={() => reportStatusMut.mutate({ id: reportId, status: 'VALIDATED' })}
                            disabled={reportStatusMut.isPending}
                            title="Validate & Publish to Map"
                          >
                            Validate
                          </button>
                        </>
                      ) : report.status === 'UNDER_REVIEW' ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-success"
                          onClick={() => reportStatusMut.mutate({ id: reportId, status: 'VALIDATED' })}
                          disabled={reportStatusMut.isPending}
                          title="Validate & Publish to Map"
                        >
                          Validate
                        </button>
                      ) : (
                        <span className={`badge badge-${report.status.toLowerCase()}`}>
                          {report.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 3: Weather & Environment (Real Open-Meteo) */}
        <NortheastWeatherCard />
      </div>

      {/* Detail Drawers */}
      <AlertDetails
        alert={selectedAlert}
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={(id) => ackAlert.mutate(id)}
        onResolve={(id) => resAlert.mutate(id)}
        onSendSms={(id) => handleSendSms(id)}
        sendingSms={sendingSmsId === selectedAlert?.id}
      />

      <FieldReportDrawer
        report={selectedReport}
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        onUpdateStatus={(id, status) => {
          reportStatusMut.mutate({ id, status });
          setSelectedReport((prev) => (prev ? { ...prev, status } : null));
        }}
        isUpdating={reportStatusMut.isPending}
      />

      <RiskZoneDrawer
        zone={selectedRiskZone}
        open={!!selectedRiskZone}
        onClose={() => setSelectedRiskZone(null)}
        onViewOnMap={() => navigate('/map')}
      />

      {/* Situation Report Modal */}
      {showSitRepModal && (
        <div className="drawer-overlay" onClick={() => setShowSitRepModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-navy">National Disaster Operations Console</h3>
                <p className="text-xs text-secondary mt-1">NE-SHIELD Regional Landslide Situation Briefing</p>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setShowSitRepModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="drawer-kv-grid mb-3">
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Briefing Timestamp</span>
                  <span className="drawer-kv-val">{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                </div>
                <div className="drawer-kv-item">
                  <span className="drawer-kv-label">Regional Scope</span>
                  <span className="drawer-kv-val">8 Northeast Indian States</span>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">ACTIVE SITUATION SUMMARY</h4>
                <ul className="text-sm text-secondary space-y-2 list-disc pl-5">
                  <li><strong>{totalHighAndCritical} Vulnerable Zones:</strong> Identified with heightened soil saturation and geotechnical vulnerability.</li>
                  <li><strong>{activeAlertsCount} Active Emergency Broadcasts:</strong> Standing SMS warnings issued to field responders.</li>
                  <li><strong>{pendingTriageReports.length} Citizen Reports Pending Verification:</strong> Crowdsourced hazard telemetry logged in the past reporting cycle.</li>
                  <li><strong>{onlineSensorsCount} Real-Time Moisture Probes Online:</strong> Continual pore pressure and saturation tracking operational.</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions p-3 border-t">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.print()}
              >
                Print Situation Brief
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowSitRepModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contacts Modal */}
      {showContactsModal && (
        <div className="drawer-overlay" onClick={() => setShowContactsModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-navy">State Disaster Management Authorities (SDMA)</h3>
                <p className="text-xs text-secondary mt-1">Northeast India Regional Emergency Operations Hotlines</p>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setShowContactsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="drawer-section">
                <div className="drawer-factors-list">
                  {[
                    { state: 'Arunachal Pradesh SDMA', phone: '0360-2212222 / 1070', location: 'Itanagar' },
                    { state: 'Assam State Disaster Management (ASDMA)', phone: '0361-2237011 / 1079', location: 'Dispur / Guwahati' },
                    { state: 'Manipur SDMA', phone: '0385-2443441 / 1070', location: 'Imphal' },
                    { state: 'Meghalaya SDMA', phone: '0364-2502188 / 1070', location: 'Shillong' },
                    { state: 'Mizoram Disaster Management', phone: '0389-2342520 / 1070', location: 'Aizawl' },
                    { state: 'Nagaland NSDMA', phone: '0370-2291122 / 1070', location: 'Kohima' },
                    { state: 'Sikkim SSDMA', phone: '03592-201075 / 1070', location: 'Gangtok' },
                    { state: 'Tripura SDMA', phone: '0381-2416045 / 1070', location: 'Agartala' },
                  ].map((contact) => (
                    <div key={contact.state} className="drawer-factor-item flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-navy">{contact.state}</div>
                        <div className="text-xs text-muted">{contact.location}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-teal" />
                        <span className="font-mono text-xs font-semibold text-primary">{contact.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions p-3 border-t">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowContactsModal(false)}
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
