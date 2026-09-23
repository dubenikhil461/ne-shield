import { useMemo, type FC } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  targetDate: string;
  onDateChange: (d: string) => void;
  onRefresh: () => void;
  isMock: boolean;
  onToggleMock: (m: boolean) => void;
  loading: boolean;
  totalSettlements: number;
  lastFetched?: string;
  visibleReportCount?: number;
  totalValidatedReports?: number;
  showReportLayer?: boolean;
  onToggleReportLayer?: (show: boolean) => void;
  onLocateReports?: () => void;
}

export const HazardMapHeader: FC<Props> = ({
  targetDate,
  onDateChange,
  onRefresh,
  isMock,
  onToggleMock,
  loading,
  totalSettlements,
  lastFetched,
  visibleReportCount = 0,
  totalValidatedReports = 0,
  showReportLayer = true,
  onToggleReportLayer,
  onLocateReports,
}) => {
  const cachetime = useMemo(() => {
    if (!lastFetched) return null;
    try {
      return new Date(lastFetched).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return lastFetched;
    }
  }, [lastFetched]);

  const reportText =
    visibleReportCount === 1
      ? "1 report found in this area"
      : `${visibleReportCount} reports found in this area`;

  return (
    <header
      style={{
        minHeight: 64,
        backgroundColor: "#0f172a",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1100,
        flexShrink: 0,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          NE-SHIELD &bull; Landslide Early Warning &bull; 9 Districts
        </h1>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          Terrain Heuristic + Caine/API15 Dynamic Trigger &bull; {totalSettlements} Verified Settlements
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Visible crowd report counter banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: visibleReportCount > 0 ? "#1e1b4b" : "#1e293b",
            border: visibleReportCount > 0 ? "1px solid #6366f1" : "1px solid #334155",
            padding: "4px 12px",
            borderRadius: 14,
            fontSize: 12,
          }}
        >
          <AlertTriangle size={14} color="#f59e0b" />
          <span
            style={{
              fontWeight: 600,
              color: visibleReportCount > 0 ? "#a5b4fc" : "#cbd5e1",
            }}
          >
            {reportText}
          </span>
          {totalValidatedReports > 0 && onLocateReports && (
            <button
              onClick={onLocateReports}
              style={{
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid #6366f1",
                color: "#e0e7ff",
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 10,
                cursor: "pointer",
                marginLeft: 4,
              }}
              title="Focus map on validated citizen reports"
            >
              Locate ({totalValidatedReports})
            </button>
          )}
        </div>

        {/* Dynamic Report layer toggle */}
        {onToggleReportLayer && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#cbd5e1",
              cursor: "pointer",
              backgroundColor: "#1e293b",
              padding: "4px 10px",
              borderRadius: 14,
              border: "1px solid #334155",
            }}
          >
            <input
              type="checkbox"
              checked={showReportLayer}
              onChange={(e) => onToggleReportLayer(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Field Reports ({totalValidatedReports})</span>
          </label>
        )}

        {/* Status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#1e293b",
            padding: "4px 10px",
            borderRadius: 14,
            border: "1px solid #334155",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isMock ? "#f59e0b" : "#10b981",
            }}
          />
          <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>
            {isMock ? "Mock scenario" : cachetime ? `Cache synced: ${cachetime}` : "Live mode"}
          </span>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 500 }}>Mode:</label>
          <select
            value={isMock ? "mock" : "live"}
            onChange={(e) => onToggleMock(e.target.value === "mock")}
            style={{
              backgroundColor: "#1e293b",
              color: "#f8fafc",
              border: "1px solid #475569",
              borderRadius: 4,
              padding: "5px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <option value="live">Live Open-Meteo Weather</option>
            <option value="mock">Simulated Monsoon Storm</option>
          </select>
        </div>

        {/* Date picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 500 }}>Date:</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => onDateChange(e.target.value)}
            style={{
              backgroundColor: "#1e293b",
              color: "#f8fafc",
              border: "1px solid #475569",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 12,
            }}
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Updating…" : "Refresh Hazard"}
        </button>
      </div>
    </header>
  );
};
