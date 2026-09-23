import { useEffect, useRef, useCallback, type FC } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HazardFeature, HazardZoneProperties, WarningLevel } from "../../api/hazard/types";
import type { CrowdReport } from "../../api/fieldReportApi";

interface HazardMapProps {
  features: HazardFeature[];
  selectedZone: HazardZoneProperties | null;
  onSelectZone: (zone: HazardZoneProperties) => void;
  reports?: CrowdReport[];
  showReports?: boolean;
  onVisibleReportCountChange?: (count: number) => void;
  onInitMap?: (map: L.Map) => void;
}

const WARNING_COLORS: Record<WarningLevel, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#10b981",
};

const IOT_BORDER_COLOR = "#7c3aed";

export const HazardMap: FC<HazardMapProps> = ({
  features,
  selectedZone,
  onSelectZone,
  reports = [],
  showReports = true,
  onVisibleReportCountChange,
  onInitMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const settlementsLayerRef = useRef<L.LayerGroup | null>(null);
  const reportsLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectZone);
  onSelectRef.current = onSelectZone;

  // Calculate visible reports based on the map's current bounding box
  const calculateVisibleCount = useCallback(() => {
    if (!mapRef.current || !onVisibleReportCountChange) return;
    if (!showReports) {
      onVisibleReportCountChange(0);
      return;
    }
    const bounds = mapRef.current.getBounds();
    let count = 0;
    reports.forEach((r) => {
      const lat = r.location?.latitude;
      const lon = r.location?.longitude;
      if (lat != null && lon != null && bounds.contains([lat, lon])) {
        count++;
      }
    });
    onVisibleReportCountChange(count);
  }, [reports, showReports, onVisibleReportCountChange]);

  // Initialise Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [26.2, 94.4],
      zoom: 8,
      minZoom: 4,
      maxZoom: 18,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const sLayer = L.layerGroup().addTo(map);
    const rLayer = L.layerGroup().addTo(map);

    settlementsLayerRef.current = sLayer;
    reportsLayerRef.current = rLayer;
    mapRef.current = map;

    if (onInitMap) {
      onInitMap(map);
    }

    const onMapMove = () => {
      calculateVisibleCount();
    };

    map.on("moveend", onMapMove);
    map.on("zoomend", onMapMove);

    return () => {
      map.off("moveend", onMapMove);
      map.off("zoomend", onMapMove);
      map.remove();
      mapRef.current = null;
      settlementsLayerRef.current = null;
      reportsLayerRef.current = null;
    };
  }, [onInitMap, calculateVisibleCount]);

  // Re-render settlement markers whenever features or selectedZone changes
  useEffect(() => {
    if (!settlementsLayerRef.current) return;
    settlementsLayerRef.current.clearLayers();

    features.forEach((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const p = feature.properties;
      const isSelected = selectedZone?.settlement_id === p.settlement_id;
      const isIoT = p.is_iot_monitored;
      const color = WARNING_COLORS[p.warning_level] ?? "#94a3b8";

      const radius = isSelected
        ? 10
        : p.warning_level === "red"
        ? 8
        : p.warning_level === "orange"
        ? 7
        : 5;

      const circle = L.circleMarker([lat, lon], {
        radius,
        fillColor: color,
        color: isSelected ? "#0f172a" : isIoT ? IOT_BORDER_COLOR : "#ffffff",
        weight: isSelected ? 3 : isIoT ? 2.5 : 1,
        opacity: 0.95,
        fillOpacity: isSelected ? 1.0 : 0.88,
      });

      const iotBadge = isIoT
        ? `<br/><span style="color:${IOT_BORDER_COLOR};font-weight:bold">IoT Monitored: ${
            p.iot_moisture?.toFixed(1) ?? "—"
          }% moisture</span>`
        : "";

      circle.bindTooltip(
        `<strong>${p.name || p.settlement_id}</strong> (${p.district})<br/>
         Warning: <span style="font-weight:bold;text-transform:uppercase;color:${color}">${p.warning_level}</span><br/>
         Slope: ${p.slope_deg}° | 24h Rain: ${p.rain_24h_mm} mm${iotBadge}`,
        { direction: "top", offset: [0, -6] }
      );

      circle.on("click", () => {
        onSelectRef.current(p);
      });

      circle.addTo(settlementsLayerRef.current!);
    });
  }, [features, selectedZone]);

  // Re-render dynamic field reports layer
  useEffect(() => {
    if (!reportsLayerRef.current) return;
    reportsLayerRef.current.clearLayers();

    if (!showReports) {
      calculateVisibleCount();
      return;
    }

    reports.forEach((report) => {
      const lat = report.location?.latitude;
      const lon = report.location?.longitude;
      if (lat == null || lon == null) return;

      const sevColor = SEVERITY_COLORS[report.userSeverity || "MEDIUM"] || "#f59e0b";

      // Distinctive pulsating hazard marker icon
      const reportIcon = L.divIcon({
        className: "leaflet-hazard-report-icon",
        html: `
          <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <div style="position:absolute;width:34px;height:34px;border-radius:50%;background:${sevColor};opacity:0.3;animation:pulse 1.8s ease-out infinite;"></div>
            <div style="width:22px;height:22px;border-radius:50%;background:${sevColor};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffffff;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lon], { icon: reportIcon });

      // Image gallery HTML for popup
      let imagesHtml = "";
      if (report.images && report.images.length > 0) {
        imagesHtml = `
          <div style="margin-top:10px;">
            <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">
              Citizen Photos (${report.images.length})
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${report.images
                .map(
                  (img, idx) => `
                <a href="${img.url}" target="_blank" rel="noopener noreferrer" title="Click to open full photo">
                  <img src="${img.thumbnailUrl || img.url}" alt="Report photo ${idx + 1}"
                    style="width:90px;height:65px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;" />
                </a>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      }

      const flagsHtml = `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin:6px 0;">
          ${
            report.roadBlocked
              ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">ROAD BLOCKED</span>'
              : ""
          }
          ${
            report.peopleNearby
              ? '<span style="background:#ffedd5;color:#9a3412;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">People Nearby</span>'
              : ""
          }
          ${
            report.buildingsNearby
              ? '<span style="background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">Buildings Exposed</span>'
              : ""
          }
        </div>
      `;

      const popupContent = `
        <div style="font-family:system-ui,sans-serif;min-width:240px;max-width:320px;padding:2px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="font-size:14px;color:#0f172a;">${report.referenceId}</strong>
            <span style="font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;background:#ede9fe;color:#5b21b6;">
              ${report.status}
            </span>
          </div>

          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#334155;font-weight:600;">
              ${(report.incidentType || "HAZARD").replace("_", " ")}
            </span>
            <span style="font-size:11px;font-weight:700;color:${sevColor};">
              [${report.userSeverity || "MEDIUM"} SEVERITY]
            </span>
          </div>

          <div style="font-size:13px;color:#1e293b;margin:6px 0;line-height:1.4;">
            ${report.description}
          </div>

          ${flagsHtml}

          <div style="font-size:11px;color:#64748b;margin-top:6px;">
            GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}
            ${report.location?.accuracy ? ` (±${Math.round(report.location.accuracy)}m)` : ""}
          </div>

          ${imagesHtml}

          <div style="font-size:10px;color:#94a3b8;margin-top:8px;border-top:1px solid #f1f5f9;padding-top:4px;">
            Reported: ${new Date(report.createdAt).toLocaleString()} &bull; Source: ${report.source || "PWA"}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 360 });
      marker.addTo(reportsLayerRef.current!);
    });

    calculateVisibleCount();
  }, [reports, showReports, calculateVisibleCount]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", backgroundColor: "#e2e8f0" }}
    />
  );
};
