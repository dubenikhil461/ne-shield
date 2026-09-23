import { useState, type FC, type CSSProperties } from "react";
import { Activity } from "lucide-react";
import type { HazardZoneProperties, WarningLevel } from "../../api/hazard/types";

interface Props {
  zone: HazardZoneProperties | null;
  onClose: () => void;
  onRefetch?: (id: string) => Promise<void>;
  isRefetching?: boolean;
}

const BADGE: Record<WarningLevel, { bg: string; text: string; label: string }> = {
  green:  { bg: "#dcfce7", text: "#15803d", label: "GREEN — NORMAL"  },
  yellow: { bg: "#fef9c3", text: "#a16207", label: "YELLOW — WATCH"  },
  orange: { bg: "#ffedd5", text: "#c2410c", label: "ORANGE — WARNING" },
  red:    { bg: "#fee2e2", text: "#b91c1c", label: "RED — ALERT"      },
};

const Tip: FC<{ text: string }> = ({ text }) => {
  const [v, setV] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 4, cursor: "help" }}
      onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>
      <span style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "#cbd5e1",
        color: "#334155", fontSize: 9, fontWeight: 700, display: "inline-flex",
        alignItems: "center", justifyContent: "center" }}>?</span>
      {v && (
        <span style={{ position: "absolute", top: "calc(100% + 4px)", left: 0,
          width: 170, backgroundColor: "#0f172a", color: "#f8fafc", fontSize: 10,
          padding: "6px 8px", borderRadius: 4, zIndex: 9999, pointerEvents: "none" }}>
          {text}
        </span>
      )}
    </span>
  );
};

export const HazardSidePanel: FC<Props> = ({ zone, onClose, onRefetch, isRefetching }) => {
  if (!zone) {
    return (
      <aside style={s.container}>
        <div style={s.empty}>
          <h3 style={{ margin: "0 0 8px", color: "#334155" }}>Settlement Details</h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
            Click any settlement point on the map to inspect its real-time warning decision,
            static susceptibility, and meteorological triggers.
          </p>
        </div>
      </aside>
    );
  }

  const badge = BADGE[zone.warning_level];
  const fetchedTime = zone.fetched_at
    ? new Date(zone.fetched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <aside style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {zone.district} District &bull; {zone.source}
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, color: "#0f172a" }}>
            {zone.name || zone.settlement_id}
          </h2>
        </div>
        <button onClick={onClose} style={s.closeBtn}>&times;</button>
      </div>

      {/* IoT badge */}
      {zone.is_iot_monitored && (
        <div style={{ padding: "6px 12px", borderRadius: 6, backgroundColor: "#ede9fe",
          color: "#6d28d9", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={14} /> IoT Live Monitoring Active &mdash; {zone.iot_moisture?.toFixed(1) ?? "—"}% soil moisture
        </div>
      )}

      {/* Warning badge */}
      <div style={{ ...s.warnBadge, backgroundColor: badge.bg, color: badge.text }}>
        {badge.label}
      </div>

      {/* Refetch button */}
      {onRefetch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => onRefetch(zone.settlement_id)}
            disabled={isRefetching}
            style={{ ...s.refetchBtn, opacity: isRefetching ? 0.7 : 1, cursor: isRefetching ? "not-allowed" : "pointer" }}>
            {isRefetching ? "Refetching…" : "Refetch Live Weather"}
          </button>
          {fetchedTime && <span style={{ fontSize: 11, color: "#64748b" }}>Fetched: {fetchedTime}</span>}
        </div>
      )}

      {/* Explanation */}
      <section style={s.section}>
        <h4 style={s.sectionTitle}>Authoritative Warning Explanation</h4>
        <div style={s.explanBox}>{zone.explanation}</div>
      </section>

      {/* Terrain */}
      <section style={s.section}>
        <h4 style={s.sectionTitle}>Static Susceptibility (Terrain Heuristic)</h4>
        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.label}>Susceptibility Score</div>
            <div style={s.value}>{zone.static_susceptibility.toFixed(3)}</div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>Tier: {zone.susceptibility_tier}</div>
          </div>
          <div style={s.card}>
            <div style={s.label}>250m Zonal Slope</div>
            <div style={s.value}>{zone.slope_deg.toFixed(1)}°</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>90th Percentile</div>
          </div>
          <div style={s.card}>
            <div style={s.label}>Elevation</div>
            <div style={s.value}>{Math.round(zone.elevation_m)} m</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Centroid</div>
          </div>
          <div style={s.card}>
            <div style={s.label}>Profile Curvature <Tip text="Negative = concave (collects runoff). Positive = convex (sheds runoff)." /></div>
            <div style={s.value}>{zone.profile_curv.toFixed(4)}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Horn 1981</div>
          </div>
        </div>
      </section>

      {/* Dynamic trigger */}
      <section style={s.section}>
        <h4 style={s.sectionTitle}>Dynamic Hydrometeorological Trigger</h4>
        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.label}>24h Rainfall</div>
            <div style={s.value}>{zone.rain_24h_mm.toFixed(1)} mm</div>
            <div style={{ fontSize: 11, color: zone.caine_exceedance ? "#b91c1c" : "#64748b",
              fontWeight: zone.caine_exceedance ? "bold" : "normal" }}>
              Caine: {zone.caine_threshold_24h_mm} mm
            </div>
          </div>
          <div style={s.card}>
            <div style={s.label}>
              Antecedent Rain (API15)
              <Tip text="15-day decayed rain sum (k=0.85). Measures prolonged soil saturation." />
            </div>
            <div style={s.value}>{zone.api15_mm != null ? `${zone.api15_mm.toFixed(1)} mm` : "N/A"}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Decay k = 0.85</div>
          </div>
          <div style={s.card}>
            <div style={s.label}>Trigger State</div>
            <div style={{ ...s.value, textTransform: "uppercase", fontSize: 15,
              color: zone.trigger_state === "dry" ? "#16a34a" : zone.trigger_state === "wet" ? "#d97706" : "#dc2626" }}>
              {zone.trigger_state}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Compounding state</div>
          </div>
          <div style={s.card}>
            <div style={s.label}>Coordinates</div>
            <div style={{ ...s.value, fontSize: 13 }}>{zone.lat.toFixed(4)}N</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{zone.lon.toFixed(4)}E</div>
          </div>
        </div>
      </section>
    </aside>
  );
};

const s: Record<string, CSSProperties> = {
  container: { width: 360, minWidth: 320, height: "100%", backgroundColor: "#fff",
    borderLeft: "1px solid #e2e8f0", padding: 20, boxSizing: "border-box",
    overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column",
    gap: 16, boxShadow: "-2px 0 8px rgba(0,0,0,0.04)" },
  empty: { padding: "32px 16px", textAlign: "center", backgroundColor: "#f8fafc",
    borderRadius: 8, border: "1px dashed #cbd5e1", marginTop: 40 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    borderBottom: "1px solid #f1f5f9", paddingBottom: 12 },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#94a3b8",
    cursor: "pointer", lineHeight: 1, padding: "0 4px" },
  warnBadge: { padding: "8px 12px", borderRadius: 6, fontWeight: 700,
    fontSize: 13, textAlign: "center", letterSpacing: "0.5px" },
  section: { display: "flex", flexDirection: "column", gap: 8 },
  sectionTitle: { margin: 0, fontSize: 12, fontWeight: 600, color: "#475569",
    textTransform: "uppercase", letterSpacing: "0.5px" },
  explanBox: { padding: 12, backgroundColor: "#f8fafc", borderLeft: "3px solid #3b82f6",
    borderRadius: "0 4px 4px 0", fontSize: 13, color: "#1e293b", lineHeight: 1.5 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  card: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" },
  label: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  value: { fontSize: 16, fontWeight: 600, color: "#0f172a" },
  refetchBtn: { backgroundColor: "#0284c7", color: "#fff", border: "none",
    borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
};
