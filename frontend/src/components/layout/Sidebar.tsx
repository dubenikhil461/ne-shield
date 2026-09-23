import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  ShieldAlert,
  FileWarning,
  Bell,
  BarChart3,
  Camera,
  Users,
  FileText,
  Settings,
} from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import { useQuery } from '@tanstack/react-query';
import { fetchFieldReports } from '../../api/fieldReportApi';
import IndiaNortheastVisual from './IndiaNortheastVisual';

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number | null;
  badgeColor?: string;
}

export default function Sidebar() {
  const { data: alertsData } = useAlerts({ status: 'ACTIVE' });
  const { data: reportsData } = useQuery({
    queryKey: ['fieldReports'],
    queryFn: () => fetchFieldReports(),
    refetchInterval: 15000,
  });

  const activeAlertCount = alertsData?.active_count ?? alertsData?.total ?? (alertsData?.data?.length || 0);

  const pendingReportCount = (reportsData?.data || []).filter(
    (r) => r.status === 'RECEIVED' || r.status === 'UNDER_REVIEW'
  ).length;

  const mainNavItems: NavItemConfig[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/map', label: 'Live GIS Map', icon: Map },
    { to: '/risk', label: 'Risk Overview', icon: ShieldAlert },
    {
      to: '/field-reports',
      label: 'Field Reports',
      icon: FileWarning,
      badge: pendingReportCount > 0 ? pendingReportCount : null,
      badgeColor: '#0F766E',
    },
    {
      to: '/alerts',
      label: 'Alert System',
      icon: Bell,
      badge: activeAlertCount > 0 ? activeAlertCount : null,
      badgeColor: '#B91C1C',
    },
    { to: '/impact', label: 'Analytics', icon: BarChart3 },
    { to: '/sensors', label: 'Teams & Sensors', icon: Users },
    { to: '/field-reports?view=media', label: 'Media Archive', icon: Camera },
    { to: '/system?tab=bulletin', label: 'Documents & Bulletins', icon: FileText },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-badge">NDMA / DISASTER OPS</div>
        <h2 className="sidebar-brand-title">NE-SHIELD</h2>
        <div className="sidebar-brand-meta">
          <span className="sidebar-region">NorthEast India</span>
          <span className="sidebar-dot">•</span>
          <span className="sidebar-role">Landslide Monitor</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-section-title">CORE OPERATIONS</div>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="sidebar-icon" size={17} strokeWidth={2} />
              <span className="sidebar-label">{item.label}</span>
              {item.badge != null && (
                <span
                  className="sidebar-badge"
                  style={{ backgroundColor: item.badgeColor || '#0F766E' }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="sidebar-divider" />

        <div className="sidebar-nav-section-title">CONFIGURATION</div>
        <NavLink
          to="/system"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
          }
        >
          <Settings className="sidebar-icon" size={17} strokeWidth={2} />
          <span className="sidebar-label">Settings & Telemetry</span>
        </NavLink>
      </nav>

      {/* Bottom India Silhouette Visual */}
      <div className="sidebar-footer">
        <IndiaNortheastVisual />
      </div>
    </aside>
  );
}
