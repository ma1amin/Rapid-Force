import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface LiveEvent {
  type: string;
  data: unknown;
  ts: number;
  _id: string;
}

export function useLiveEvents(maxEvents = 30) {
  const [events, setEvents]       = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastTs, setLastTs]       = useState<number | null>(null);
  const esRef                     = useRef<EventSource | null>(null);
  const retryRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef                = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      const es = new EventSource(`${BASE}/api/events/stream`, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        es.close();
        retryRef.current = setTimeout(connect, 4000);
      };

      es.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data as string);
          if (event.type === "connected") return;
          const liveEvent: LiveEvent = {
            type: event.type,
            data: event.data,
            ts:   event.ts ?? Date.now(),
            _id:  `${event.ts}-${Math.random().toString(36).slice(2)}`,
          };
          setEvents(prev => [liveEvent, ...prev].slice(0, maxEvents));
          setLastTs(liveEvent.ts);
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // EventSource not available (SSR/test env)
    }
  }, [maxEvents]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  return { events, connected, lastTs };
}
