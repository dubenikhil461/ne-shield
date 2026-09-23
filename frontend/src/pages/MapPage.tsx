import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type L from "leaflet";
import { fetchHazardZones, refreshSettlementWeather } from "../api/hazard/hazardApi";
import { fetchFieldReports, type CrowdReport } from "../api/fieldReportApi";
import type { HazardFeatureCollection, HazardZoneProperties } from "../api/hazard/types";
import { HazardMap } from "../components/hazard/HazardMap";
import { HazardSidePanel } from "../components/hazard/HazardSidePanel";
import { HazardLegend } from "../components/hazard/HazardLegend";
import { HazardMapHeader } from "../components/hazard/HazardMapHeader";

/**
 * MapPage — Full-screen Leaflet Landslide Hazard Warning Map.
 *
 * Renders 1,386 settlement markers coloured by real-time warning level
 * from the NE-SHIELD hazard engine, combined with a dynamic layer
 * of validated citizen field reports from the crowd reporting microservice.
 */
export default function MapPage() {
  const [data, setData] = useState<HazardFeatureCollection | null>(null);
  const [selectedZone, setSelectedZone] = useState<HazardZoneProperties | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field reports dynamic layer state
  const [visibleReportCount, setVisibleReportCount] = useState<number>(0);
  const [showReportLayer, setShowReportLayer] = useState<boolean>(true);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Fetch verified & operational crowd reports from microservice
  const { data: reportsData } = useQuery({
    queryKey: ['fieldReports'],
    queryFn: () => fetchFieldReports(),
    refetchInterval: 15000,
  });

  const validatedReports: CrowdReport[] = (reportsData?.data || []).filter(
    (r) => r.status === "VALIDATED" || r.status === "IN_PROGRESS"
  );

  const loadZones = useCallback(
    async (date: string, mock: boolean, forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const col = await fetchHazardZones({
          date,
          mock,
          refresh: forceRefresh,
        });
        setData(col);
        // Keep selected zone up-to-date
        setSelectedZone((prev) => {
          if (!prev) return null;
          const updated = col.features.find(
            (f) => f.properties.settlement_id === prev.settlement_id
          );
          return updated ? updated.properties : prev;
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(`Failed to load hazard data: ${msg}. Ensure the FastAPI backend is running on port 8000.`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load + whenever date/mock changes
  useEffect(() => {
    loadZones(targetDate, isMock, false);
  }, [targetDate, isMock, loadZones]);

  const handleRefetchZone = useCallback(
    async (settlementId: string) => {
      setRefetching(true);
      try {
        const feat = await refreshSettlementWeather(settlementId, {
          date: targetDate,
          mock: isMock,
        });
        setSelectedZone(feat.properties);
        setData((prev) => {
          if (!prev) return prev;
          const newFeatures = prev.features.map((f) =>
            f.id === settlementId ? feat : f
          );
          return { ...prev, features: newFeatures };
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(`Refetch failed: ${msg}`);
      } finally {
        setRefetching(false);
      }
    },
    [targetDate, isMock]
  );

  // Focus map on the first validated citizen report
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* In-page header with live report counter and controls */}
      <HazardMapHeader
        targetDate={targetDate}
        onDateChange={setTargetDate}
        onRefresh={() => loadZones(targetDate, isMock, true)}
        isMock={isMock}
        onToggleMock={setIsMock}
        loading={loading}
        totalSettlements={data?.features.length ?? 1386}
        lastFetched={data?.metadata?.generated_at}
        visibleReportCount={visibleReportCount}
        totalValidatedReports={validatedReports.length}
        showReportLayer={showReportLayer}
        onToggleReportLayer={setShowReportLayer}
        onLocateReports={handleLocateReports}
      />

      {/* Error banner */}
      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "8px 16px",
          fontSize: 13, borderBottom: "1px solid #fca5a5", zIndex: 1050, flexShrink: 0 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && !data && (
        <div style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "8px 16px",
          fontSize: 13, borderBottom: "1px solid #bfdbfe", flexShrink: 0 }}>
          Loading 1,386 settlements from NE-SHIELD hazard engine…
        </div>
      )}

      {/* Main content: map + side panel */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Map area */}
        <div style={{ flex: 1, position: "relative" }}>
          <HazardMap
            features={data?.features ?? []}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            reports={validatedReports}
            showReports={showReportLayer}
            onVisibleReportCountChange={setVisibleReportCount}
            onInitMap={(map) => {
              leafletMapRef.current = map;
            }}
          />
          <HazardLegend
            summary={data?.metadata?.summary}
            iotMonitored={data?.metadata?.iot_monitored_settlements}
          />
        </div>

        {/* Inspector side panel */}
        <HazardSidePanel
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
          onRefetch={handleRefetchZone}
          isRefetching={refetching}
        />
      </div>
    </div>
  );
}
