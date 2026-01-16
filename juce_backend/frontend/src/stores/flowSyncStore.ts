import { create } from 'zustand';
import createFlowWebSocket from '@/hooks/useFlowWebSocket';

type ViewType = 'daw' | 'theory';

interface FlowSyncState {
  connected: boolean;
  lastSent?: { view: ViewType; payload: unknown };
  connect: (url?: string) => void;
  disconnect: () => void;
  publishPatch: (view: ViewType, payload: unknown) => void;
  flush: (view?: ViewType) => void;
}

// Create the WS API instance. Tests may mock the module before import to intercept this.
const wsApi = createFlowWebSocket('flow-sync-store');

// Simple debounce/merge per-view to avoid flooding the socket.
const pending: Partial<Record<ViewType, unknown>> = {};
const timers: Partial<Record<ViewType, ReturnType<typeof setTimeout>>> = {};
const DEBOUNCE_MS = 120;

type LastSent = { view: ViewType; payload: unknown };

function scheduleSend(view: ViewType, setLastSent: (s: LastSent) => void) {
  if (timers[view]) return;
  timers[view] = setTimeout(() => {
    const payload = pending[view];
    if (payload !== undefined) {
      try {
        wsApi.sendLocalPatch(view, payload);
        setLastSent({ view, payload });
      } catch (e) {
        console.debug('sendLocalPatch failed', e);
      }
      pending[view] = undefined;
    }
    // clear timer
    if (timers[view]) {
      clearTimeout(timers[view] as ReturnType<typeof setTimeout>);
      timers[view] = undefined;
    }
  }, DEBOUNCE_MS) as unknown as ReturnType<typeof setTimeout>;
}

export const useFlowSyncStore = create<FlowSyncState>((set) => ({
  connected: false,
  lastSent: undefined,
  connect: (url?: string) => {
    wsApi.connect(url);
    set({ connected: true });
  },
  disconnect: () => {
    wsApi.disconnect();
    set({ connected: false });
  },
  publishPatch: (view: ViewType, payload: unknown) => {
    // merge shallowly with any pending payload for the view
    const existing = pending[view];
    if (existing && typeof existing === 'object' && payload && typeof payload === 'object') {
      pending[view] = { ...(existing as Record<string, unknown>), ...(payload as Record<string, unknown>) };
    } else {
      pending[view] = payload;
    }
    // schedule send
    scheduleSend(view, (last) => set({ lastSent: last }));
  },
  flush: (view?: ViewType) => {
    // force-send pending for a view or all views
    const views: ViewType[] = view ? [view] : ['daw', 'theory'];
    views.forEach(v => {
      const p = pending[v];
      if (p !== undefined) {
        try {
          wsApi.sendLocalPatch(v, p);
          set({ lastSent: { view: v, payload: p } });
        } catch (e) {
          console.debug('flush sendLocalPatch failed', e);
        }
        pending[v] = undefined;
      }
      if (timers[v]) {
        clearTimeout(timers[v] as ReturnType<typeof setTimeout>);
        timers[v] = undefined;
      }
    });
  },
}));

export default useFlowSyncStore;
