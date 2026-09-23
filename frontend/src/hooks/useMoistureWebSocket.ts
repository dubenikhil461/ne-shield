import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/moisture';

interface MoistureEvent {
  event: string;
  data: {
    sensor_id: number;
    sensor_code: string;
    timestamp: string;
    moisture_percent: number;
    battery_level: number | null;
    status: string;
    moisture_status: string;
  };
}

export function useMoistureWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<MoistureEvent | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (msg) => {
      try {
        const event: MoistureEvent = JSON.parse(msg.data);
        setLastUpdate(event);
        // Invalidate related queries
        qc.invalidateQueries({ queryKey: ['sensors'] });
        qc.invalidateQueries({ queryKey: ['sensor'] });
        qc.invalidateQueries({ queryKey: ['riskCurrent'] });
        qc.invalidateQueries({ queryKey: ['riskZone'] });
        qc.invalidateQueries({ queryKey: ['alerts'] });
        qc.invalidateQueries({ queryKey: ['systemStatus'] });
      } catch {
        // Ignore malformed messages
      }
    };
  }, [qc]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, lastUpdate };
}
