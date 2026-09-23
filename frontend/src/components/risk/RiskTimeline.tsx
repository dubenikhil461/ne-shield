interface Props {
  zoneCode: string;
}

export default function RiskTimeline({ zoneCode }: Props) {
  return (
    <div className="risk-panel">
      <h3 className="mb-3">Risk History — {zoneCode}</h3>
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb'
      }}>
        <span className="text-muted text-sm">Risk timeline chart (to be implemented with historical data)</span>
      </div>
    </div>
  );
}
