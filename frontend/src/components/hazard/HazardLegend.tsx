import type { FC } from "react";
import type { WarningLevel } from "../../api/hazard/types";

interface LegendProps {
  summary?: Record<WarningLevel, number>;
  iotMonitored?: string[];
}

const ITEMS: { level: WarningLevel; label: string; desc: string; color: string }[] = [
  { level: "green",  label: "Green",  desc: "Baseline / Below Trigger",                             color: "#22c55e" },
  { level: "yellow", label: "Yellow", desc: "Watch: Elevated Susceptibility + Active Rain",          color: "#eab308" },
  { level: "orange", label: "Orange", desc: "Warning: High Susceptibility + Saturated Soil",         color: "#f97316" },
  { level: "red",    label: "Red",    desc: "Alert: Critical Susceptibility + Caine Exceedance",     color: "#ef4444" },
];

export const HazardLegend: FC<LegendProps> = ({ summary, iotMonitored }) => (
  <div style={{ position: "absolute", bottom: 24, left: 24, backgroundColor: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(4px)", padding: "12px 16px", borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, maxWidth: 320, border: "1px solid #cbd5e1" }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase",
      letterSpacing: "0.5px", marginBottom: 8 }}>Operational Warning Legend</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ITEMS.map((it) => (
        <div key={it.level} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: it.color,
            marginTop: 2, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
              {it.label}
              {summary != null && typeof summary[it.level] === "number" && (
                <span style={{ fontWeight: 400, color: "#64748b" }}> ({summary[it.level]})</span>
              )}
            </span>
            <span style={{ fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>{it.desc}</span>
          </div>
        </div>
      ))}
    </div>
    {iotMonitored && iotMonitored.length > 0 && (
      <div style={{ marginTop: 8, borderTop: "1px solid #e2e8f0", paddingTop: 8,
        fontSize: 11, color: "#6d28d9", display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #7c3aed",
          display: "inline-block", flexShrink: 0 }} />
        IoT monitored: {iotMonitored.length} settlement{iotMonitored.length > 1 ? "s" : ""}
      </div>
    )}
  </div>
);
