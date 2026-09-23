import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageContainer from '../components/layout/PageContainer';
import {
  fetchFieldReports,
  updateFieldReportStatus,
  type CrowdReport,
  type ReportStatus,
} from '../api/fieldReportApi';
import { formatDate } from '../utils/formatters';
import Modal from '../components/common/Modal';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import FieldReportDrawer from '../components/fieldReports/FieldReportDrawer';
import RiskBadge from '../components/risk/RiskBadge';
import {
  RefreshCw,
  Mountain,
  Zap,
  Route,
  AlertTriangle,
  Waves,
  MapPin,
  Users,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Filter,
} from 'lucide-react';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Received (New)', value: 'RECEIVED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Validated (On Map)', value: 'VALIDATED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function getIncidentIcon(type: string, size = 16) {
  switch (type) {
    case 'LANDSLIDE':
      return <Mountain size={size} className="text-critical" />;
    case 'VISIBLE_CRACK':
      return <Zap size={size} className="text-high" />;
    case 'ROAD_BLOCKAGE':
      return <Route size={size} className="text-critical" />;
    case 'ROCKFALL':
      return <AlertTriangle size={size} className="text-moderate" />;
    case 'FLOODING':
      return <Waves size={size} className="text-teal" />;
    default:
      return <AlertTriangle size={size} className="text-secondary" />;
  }
}

export default function FieldReportsPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterIncident, setFilterIncident] = useState<string>('');
  const [activeImage, setActiveImage] = useState<{ url: string; title: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [drawerReport, setDrawerReport] = useState<CrowdReport | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['fieldReports', filterStatus],
    queryFn: () => fetchFieldReports({ status: filterStatus || undefined }),
    refetchInterval: 15000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      updateFieldReportStatus(id, status),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ['fieldReports'] });
      qc.invalidateQueries({ queryKey: ['validatedFieldReports'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      setActionError(msg);
    },
  });

  const reports: CrowdReport[] = data?.data || [];
  const filteredReports = reports.filter((r) => {
    if (filterIncident && r.incidentType !== filterIncident) return false;
    return true;
  });

  // Tally counts by status
  const receivedCount = reports.filter((r) => r.status === 'RECEIVED').length;
  const underReviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const validatedCount = reports.filter((r) => r.status === 'VALIDATED').length;
  const inProgressCount = reports.filter((r) => r.status === 'IN_PROGRESS').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  return (
    <PageContainer
      title="Citizen Hazard Reports"
      subtitle="Crowdsourced incident verification & field operations dispatch across Northeast districts"
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn btn-outline btn-sm flex items-center gap-1"
        >
          <RefreshCw size={13} className={isFetching ? 'spin-icon' : ''} />
          <span>Refresh Reports</span>
        </button>
      }
    >
      {/* Triage Summary Counters */}
      <div className="summary-cards mb-4">
        <div
          className="summary-card"
          onClick={() => setFilterStatus('RECEIVED')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #0284C7' }}
        >
          <div className="summary-card-label">Received (New)</div>
          <div className="summary-card-value text-teal">
            {receivedCount}
          </div>
          <div className="summary-card-sub">Needs initial review</div>
        </div>

        <div
          className="summary-card"
          onClick={() => setFilterStatus('UNDER_REVIEW')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #D97706' }}
        >
          <div className="summary-card-label">Under Review</div>
          <div className="summary-card-value" style={{ color: '#D97706' }}>
            {underReviewCount}
          </div>
          <div className="summary-card-sub">Operator assessing</div>
        </div>

        <div
          className="summary-card"
          onClick={() => setFilterStatus('VALIDATED')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #15803D' }}
        >
          <div className="summary-card-label">Validated (Live GIS)</div>
          <div className="summary-card-value" style={{ color: '#15803D' }}>
            {validatedCount}
          </div>
          <div className="summary-card-sub">Rendered on map</div>
        </div>

        <div
          className="summary-card"
          onClick={() => setFilterStatus('IN_PROGRESS')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #4F46E5' }}
        >
          <div className="summary-card-label">In Progress</div>
          <div className="summary-card-value" style={{ color: '#4F46E5' }}>
            {inProgressCount}
          </div>
          <div className="summary-card-sub">Field crew active</div>
        </div>

        <div
          className="summary-card"
          onClick={() => setFilterStatus('RESOLVED')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #10B981' }}
        >
          <div className="summary-card-label">Resolved</div>
          <div className="summary-card-value" style={{ color: '#10B981' }}>
            {resolvedCount}
          </div>
          <div className="summary-card-sub">Archived</div>
        </div>
      </div>

      {actionError && (
        <div className="login-error mb-4">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="filter-bar mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-secondary" />
          <span className="text-xs font-semibold text-secondary uppercase">Filters:</span>
        </div>

        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ minWidth: 180 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={filterIncident}
          onChange={(e) => setFilterIncident(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="">All Incident Types</option>
          <option value="LANDSLIDE">Landslide</option>
          <option value="VISIBLE_CRACK">Visible Crack</option>
          <option value="ROAD_BLOCKAGE">Road Blockage</option>
          <option value="ROCKFALL">Rockfall</option>
          <option value="FLOODING">Flooding</option>
          <option value="OTHER_HAZARD">Other Hazard</option>
        </select>

        {(filterStatus || filterIncident) && (
          <button
            type="button"
            className="btn btn-sm btn-outline text-xs"
            onClick={() => {
              setFilterStatus('');
              setFilterIncident('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reports List */}
      {isLoading ? (
        <Loading />
      ) : isError ? (
        <div className="card p-6 text-center text-danger">
          <h4>Failed to connect to field reports microservice</h4>
          <p className="text-xs text-muted mt-2">
            {error instanceof Error ? error.message : 'Please check connection to port 8000.'}
          </p>
          <button onClick={() => refetch()} className="btn btn-primary btn-sm mt-3">
            Retry Connection
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          message={filterStatus ? `No reports with status '${filterStatus}'` : 'No crowd field reports found.'}
          icon={<FileText size={36} />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReports.map((report) => {
            const reportId = report._id || report.referenceId;
            const isValidated = report.status === 'VALIDATED' || report.status === 'IN_PROGRESS';

            return (
              <div
                key={reportId}
                className="card"
                style={{
                  padding: 16,
                  borderLeft: isValidated ? '4px solid #15803D' : '4px solid #D9E0E7',
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-4 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {getIncidentIcon(report.incidentType || 'OTHER_HAZARD', 18)}
                      <span className="font-bold text-sm text-navy">{report.referenceId}</span>
                    </div>

                    <span className="badge badge-outline">
                      {(report.incidentType || 'HAZARD').replace(/_/g, ' ')}
                    </span>

                    <RiskBadge level={report.userSeverity} size="sm" />

                    {isValidated && (
                      <span className="badge badge-validated flex items-center gap-1">
                        <MapPin size={11} /> Live on Map
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      onClick={() => setDrawerReport(report)}
                    >
                      Inspect Details
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-primary mb-3">
                  {report.description || 'No description provided.'}
                </p>

                {/* Telemetry Tags */}
                <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-secondary font-mono">
                    <MapPin size={12} />
                    <span>
                      {report.location?.latitude?.toFixed(4)}, {report.location?.longitude?.toFixed(4)}
                      {report.location?.accuracy ? ` (±${Math.round(report.location.accuracy)}m)` : ''}
                    </span>
                  </div>

                  {report.roadBlocked && (
                    <span className="badge badge-critical flex items-center gap-1">
                      <Route size={12} /> Road Blocked
                    </span>
                  )}

                  {report.peopleNearby && (
                    <span className="badge badge-high flex items-center gap-1">
                      <Users size={12} /> People Nearby
                    </span>
                  )}

                  {report.buildingsNearby && (
                    <span className="badge badge-moderate flex items-center gap-1">
                      <Building size={12} /> Structures Exposed
                    </span>
                  )}

                  {report.reporterPhone && (
                    <span className="text-secondary font-mono">
                      Phone: {report.reporterPhone}
                    </span>
                  )}

                  <span className="text-muted ml-auto">
                    {formatDate(report.createdAt)}
                  </span>
                </div>

                {/* Attached Citizen Images */}
                {report.images && report.images.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-secondary mb-2">
                      Photographic Evidence ({report.images.length})
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {report.images.map((img, i) => (
                        <div
                          key={img.fileId || i}
                          onClick={() => setActiveImage({ url: img.url, title: `${report.referenceId} - Photo ${i + 1}` })}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: '1px solid #D9E0E7',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          <img
                            src={img.thumbnailUrl || img.url}
                            alt="Incident report"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex justify-between items-center border-t pt-3 mt-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {report.status === 'RECEIVED' && (
                      <>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'UNDER_REVIEW' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-outline"
                        >
                          Mark Under Review
                        </button>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'VALIDATED' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-success flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} />
                          Validate & Publish to Map
                        </button>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'REJECTED' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-outline text-danger"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {report.status === 'UNDER_REVIEW' && (
                      <>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'VALIDATED' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-success flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} />
                          Validate & Publish to Map
                        </button>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'REJECTED' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-outline text-danger"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {report.status === 'VALIDATED' && (
                      <>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'IN_PROGRESS' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-primary flex items-center gap-1"
                        >
                          <span>Dispatch Response Team</span>
                          <ArrowRight size={13} />
                        </button>
                        <button
                          onClick={() => statusMut.mutate({ id: reportId, status: 'REJECTED' })}
                          disabled={statusMut.isPending}
                          className="btn btn-sm btn-outline text-danger"
                        >
                          Revoke / Reject
                        </button>
                      </>
                    )}

                    {report.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => statusMut.mutate({ id: reportId, status: 'RESOLVED' })}
                        disabled={statusMut.isPending}
                        className="btn btn-sm btn-success flex items-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        Mark Incident Resolved
                      </button>
                    )}

                    {report.status === 'RESOLVED' && (
                      <span className="text-xs text-safe font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Incident closed and resolved
                      </span>
                    )}

                    {report.status === 'REJECTED' && (
                      <span className="text-xs text-secondary font-medium flex items-center gap-1">
                        <XCircle size={13} /> Report rejected by operator
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted">
                    Source: {report.source || 'Citizen PWA'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {activeImage && (
        <Modal open={true} onClose={() => setActiveImage(null)} title={activeImage.title}>
          <div style={{ textAlign: 'center' }}>
            <img
              src={activeImage.url}
              alt={activeImage.title}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </Modal>
      )}

      {/* Field Report Detail Drawer */}
      <FieldReportDrawer
        report={drawerReport}
        open={!!drawerReport}
        onClose={() => setDrawerReport(null)}
        onUpdateStatus={(id, status) => {
          statusMut.mutate({ id, status });
          setDrawerReport((prev) => (prev ? { ...prev, status } : null));
        }}
        isUpdating={statusMut.isPending}
      />
    </PageContainer>
  );
}
