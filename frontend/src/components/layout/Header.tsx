import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useAlerts } from '../../hooks/useAlerts';
import { useMoistureWebSocket } from '../../hooks/useMoistureWebSocket';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: alertsData } = useAlerts({ status: 'ACTIVE' });
  const { connected, lastUpdate } = useMoistureWebSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSyncSeconds, setLastSyncSeconds] = useState<number>(0);

  // Live IST Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Timer based on WebSocket or periodic data
  useEffect(() => {
    setLastSyncSeconds(0);
    const syncTimer = setInterval(() => {
      setLastSyncSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(syncTimer);
  }, [lastUpdate]);

  const timeFormatted = useMemo(() => {
    const istDate = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(currentTime);

    const istTime = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(currentTime);

    return { date: istDate.toUpperCase(), time: `${istTime} IST` };
  }, [currentTime]);

  const activeAlertsCount = alertsData?.active_count ?? alertsData?.total ?? (alertsData?.data?.length || 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/field-reports?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="app-header">
      {/* Left: Operational Context + Government Identity Block */}
      <div className="header-left">
        <div className="header-context-tag">
          <span className="header-context-brand">NE-SHIELD</span>
          <span className="header-context-sep">/</span>
          <span className="header-context-branch">OPERATIONS</span>
        </div>

        <div className="flex items-center gap-2.5 pl-3.5 border-l border-slate-300">
          <img
            src="/emblem-of-india.png"
            alt="Emblem of India – भारत सरकार"
            className="shrink-0 self-center select-none"
            style={{ width: '36px', height: '36px', objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
          <div className="flex flex-col justify-center leading-tight">
            <span className="text-xs font-bold text-slate-900">Government of India</span>
            <span className="text-[10px] text-slate-500">Disaster Management • Northeast Region</span>
          </div>
        </div>
      </div>

      {/* Center: Large Operational Search Box */}
      <div className="header-center">
        <form onSubmit={handleSearchSubmit} className="header-search-form">
          <Search size={16} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Search location, district, report, settlement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="header-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Right: Live Sync, Clock, Alert Bell, Profile */}
      <div className="header-right">
        {/* Live IST Clock & Sync */}
        <div className="header-clock-block">
          <div className="header-clock-date">
            <Clock size={12} className="header-clock-icon" />
            <span>{timeFormatted.date}</span>
          </div>
          <div className="header-clock-time">{timeFormatted.time}</div>
          <div className="header-sync-status">
            Last synchronized: {lastSyncSeconds < 5 ? 'Just now' : `${lastSyncSeconds}s ago`}
          </div>
        </div>

        {/* Live System Pill */}
        <div className={`header-status-pill ${connected ? 'status-online' : 'status-live'}`}>
          <span className="header-status-dot" />
          <span className="header-status-text">
            {connected ? 'LIVE TELEMETRY' : 'SYS NOMINAL'}
          </span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={() => navigate('/alerts')}
          title="Active Alerts"
          aria-label="Alerts"
        >
          <Bell size={18} />
          {activeAlertsCount > 0 && (
            <span className="header-bell-badge">{activeAlertsCount}</span>
          )}
        </button>

        {/* Logged-in User & Profile Dropdown */}
        <div className="header-user-wrapper">
          <button
            type="button"
            className="header-user-trigger"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <div className="header-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="header-user-info">
              <span className="header-user-name">{user?.name || 'Duty Officer'}</span>
              <span className="header-user-role">{user?.role || 'DISASTER OPS'}</span>
            </div>
            <ChevronDown size={14} className="header-chevron" />
          </button>

          {dropdownOpen && (
            <div
              className="header-dropdown-menu"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="header-dropdown-header">
                <div className="font-semibold text-sm">{user?.name || 'Operator'}</div>
                <div className="text-xs text-muted">{user?.email || 'officer@ndma.gov.in'}</div>
                <div className="header-dropdown-badge">{user?.role || 'DISASTER OPS OFFICER'}</div>
              </div>
              <div className="header-dropdown-divider" />
              <button
                type="button"
                className="header-dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/system');
                }}
              >
                <UserIcon size={14} />
                <span>Operational Profile</span>
              </button>
              <button
                type="button"
                className="header-dropdown-item text-danger"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
              >
                <LogOut size={14} />
                <span>Sign Out Console</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}