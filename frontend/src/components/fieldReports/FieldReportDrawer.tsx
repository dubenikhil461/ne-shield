import type { CrowdReport, ReportStatus } from '../../api/fieldReportApi';
import { formatDate } from '../../utils/formatters';
import DetailDrawer from '../common/DetailDrawer';
import RiskBadge from '../risk/RiskBadge';
import {
  CheckCircle2,
  XCircle,
  Building,
  Users,
  Route,
  Phone,
  ExternalLink,
} from 'lucide-react';

interface Props {
  report: CrowdReport | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: ReportStatus) => void;
  isUpdating?: boolean;
}

export default function FieldReportDrawer({
  report,
  open,
  onClose,
  onUpdateStatus,
  isUpdating = false,
}: Props) {
  if (!report) return null;

  const reportId = report._id || report.referenceId;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={report.referenceId}
      subtitle={`Incident: ${(report.incidentType || 'HAZARD').replace(/_/g, ' ')}`}
      badge={<RiskBadge level={report.userSeverity} size="md" />}
      footer={
        <div className="flex gap-2 justify-end w-full flex-wrap">
          {report.status === 'RECEIVED' && onUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(reportId, 'UNDER_REVIEW')}
              disabled={isUpdating}
              className="btn btn-outline"
            >
              Mark Under Review
            </button>
          )}

          {report.status !== 'VALIDATED' && onUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(reportId, 'VALIDATED')}
              disabled={isUpdating}
              className="btn btn-success flex items-center gap-1"
            >
              <CheckCircle2 size={15} />
              Validate & Publish to GIS
            </button>
          )}

          {report.status !== 'REJECTED' && onUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(reportId, 'REJECTED')}
              disabled={isUpdating}
              className="btn btn-outline text-danger flex items-center gap-1"
            >
              <XCircle size={15} />
              Reject Report
            </button>
          )}
        </div>
      }
    >
      <div className="drawer-section">
        <h4 className="drawer-section-title">INCIDENT TELEMETRY</h4>
        <div className="drawer-kv-grid">
          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Triage Status</span>
            <span className={`badge badge-${report.status.toLowerCase()}`}>
              {report.status}
            </span>
          </div>

          <div className="drawer-kv-item">
            <span className="drawer-kv-label">Reported At</span>
            <span className="drawer-kv-val">{formatDate(report.createdAt)}</span>
          </div>

          <div className="drawer-kv-item">
            <span className="drawer-kv-label">GPS Coordinates</span>
            <span className="drawer-kv-val font-mono text-xs">
              {report.location?.latitude?.toFixed(5)}, {report.location?.longitude?.toFixed(5)}
            </span>
          </div>

          <div className="drawer-kv-item">
            <span className="drawer-kv-label">GPS Accuracy</span>
            <span className="drawer-kv-val">
              {report.location?.accuracy ? `±${report.location.accuracy}m` : 'Unspecified'}
            </span>
          </div>
        </div>
      </div>

      <div className="drawer-section">
        <h4 className="drawer-section-title">SITUATION OBSERVATION</h4>
        <div className="drawer-box">
          <p className="drawer-message-text">{report.description || 'No description provided.'}</p>
        </div>
      </div>

      <div className="drawer-section">
        <h4 className="drawer-section-title">CRITICAL HAZARDS & EXPOSURE</h4>
        <div className="grid-3 gap-2">
          <div className={`drawer-indicator-card ${report.roadBlocked ? 'indicator-danger' : 'indicator-safe'}`}>
            <Route size={16} />
            <div>
              <div className="text-xs font-semibold">Road Status</div>
              <div className="text-xs">{report.roadBlocked ? 'ROAD BLOCKED' : 'Passable'}</div>
            </div>
          </div>

          <div className={`drawer-indicator-card ${report.peopleNearby ? 'indicator-warn' : 'indicator-safe'}`}>
            <Users size={16} />
            <div>
              <div className="text-xs font-semibold">People Nearby</div>
              <div className="text-xs">{report.peopleNearby ? 'POPULATION AT RISK' : 'None Reported'}</div>
            </div>
          </div>

          <div className={`drawer-indicator-card ${report.buildingsNearby ? 'indicator-warn' : 'indicator-safe'}`}>
            <Building size={16} />
            <div>
              <div className="text-xs font-semibold">Structures</div>
              <div className="text-xs">{report.buildingsNearby ? 'STRUCTURES EXPOSED' : 'No Built Assets'}</div>
            </div>
          </div>
        </div>
      </div>

      {report.images && report.images.length > 0 && (
        <div className="drawer-section">
          <h4 className="drawer-section-title">FIELD PHOTOGRAPHS ({report.images.length})</h4>
          <div className="drawer-images-grid">
            {report.images.map((img, idx) => (
              <a
                key={img.fileId || idx}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="drawer-image-thumb"
              >
                <img src={img.thumbnailUrl || img.url} alt={`Incident photo ${idx + 1}`} />
                <span className="drawer-image-zoom">
                  <ExternalLink size={14} />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {report.reporterPhone && (
        <div className="drawer-section">
          <h4 className="drawer-section-title">REPORTER CONTACT</h4>
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Phone size={14} />
            <span className="font-mono">{report.reporterPhone}</span>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
