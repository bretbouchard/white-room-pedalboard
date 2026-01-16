import React, { useEffect, useRef, useState } from 'react';
import { useWebSocketStore } from '@/stores/websocketStore';

type EventItem = {
  id: string;
  type: string;
  timestamp: number;
  data: unknown;
};

const EventFeed: React.FC = () => {
  const { subscribe } = useWebSocketStore();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filter, setFilter] = useState('daid.');
  const max = 50;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      const t = msg?.type as string | undefined;
      if (!t) return;
      if (filter && !t.startsWith(filter)) return;
      setEvents((prev) => {
        const item: EventItem = {
          id: msg.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: t,
          timestamp: Date.now(),
          data: msg.data,
        };
        const next = [item, ...prev];
        if (next.length > max) next.length = max;
        return next;
      });
    });
    return () => unsub();
  }, [subscribe, filter]);

  useEffect(() => {
    if (listRef.current) {
      // noop: could auto-scroll if needed
    }
  }, [events]);

  return (
    <div className="border border-daw-border rounded p-3 bg-daw-surface">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Event Feed</div>
        <div className="flex items-center gap-2">
          <input
            className="px-2 py-1 border border-daw-border rounded bg-daw-surface text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="prefix filter (e.g., daid.)"
          />
          <button
            onClick={() => setEvents([])}
            className="px-2 py-1 rounded border border-daw-border hover:border-daw-accent-primary text-xs"
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={listRef} className="max-h-[260px] overflow-auto space-y-2">
        {events.length === 0 ? (
          <div className="text-xs text-daw-text-secondary">No events yet.</div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="text-xs border border-daw-border rounded p-2 bg-black/20">
              <div className="flex items-center justify-between">
                <div className="font-mono text-daw-text-secondary">{e.type}</div>
                <div className="text-daw-text-secondary">{new Date(e.timestamp).toLocaleTimeString()}</div>
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(e.data, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventFeed;

