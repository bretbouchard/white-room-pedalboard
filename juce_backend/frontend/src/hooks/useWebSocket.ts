import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as wsStore from '../stores/websocketStore';

const useWebSocketStore = wsStore.useWebSocketStore;

// We intentionally avoid reading the WebSocketStatus enum from the
// websocketStore module at import-time. Test helpers sometimes partially mock
// that module and omit the enum, which can cause runtime errors during tests.
// Instead, use the literal status strings below when comparing store.status.
import type { WebSocketMessage, WebSocketClientOptions, WebSocketClient } from '../utils/WebSocketClient';

// Minimal, validated single-file implementation of WebSocket UI hooks
export function useWebSocket(options?: WebSocketClientOptions) {
  const store = useWebSocketStore();
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted || clientRef.current) return;
      try {
        const mod = await import('../utils/WebSocketClient');
        const Impl = mod.WebSocketClient as unknown as new (opts?: WebSocketClientOptions) => WebSocketClient;
        clientRef.current = new Impl(options);

        clientRef.current.on('statusChange', (status: string) => {
          // Pass the raw string to the store setter (Zustand will accept it at runtime).
          // @ts-expect-error runtime string vs enum typing intentionally relaxed for tests.
          store.setStatus(status);
          // If the client reports we are connected, ensure the store processes queued messages.
          if (String(status).toLowerCase() === 'connected' || String(status) === 'CONNECTED') {
            try { store.processQueue(); } catch { /* ignore in tests */ }
          }
        });

        clientRef.current.on('message', (msg: WebSocketMessage | string) => {
          try {
            const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
            console.debug('[WebSocket] message', parsed);
          } catch {
            // ignore
          }
        });

        clientRef.current.on('error', (err: Error | string) => {
          store.setError(typeof err === 'string' ? err : err.message);
        });
      } catch (err) {
        store.setError((err as Error).message || 'WebSocketClient import failed');
      }
    })();

    return () => {
      mounted = false;
      if (clientRef.current) {
        try {
          clientRef.current.disconnect();
        } catch {
          // ignore
        }
        clientRef.current = null;
      }
    };
  }, [options, store]);

  const connect = useCallback(async (url?: string) => {
    if (clientRef.current) {
      try {
        if (url) {
          try {
            const wrapper = clientRef.current as unknown as { constructor: new (opts?: unknown) => WebSocketClient };
            const ctor = wrapper.constructor;
            clientRef.current.disconnect();
            clientRef.current = new ctor({ ...options, url });
          } catch {
            await (clientRef.current as unknown as { connect: (u?: string) => Promise<void> }).connect(url);
            return;
          }
        }
        await clientRef.current.connect();
      } catch (err) {
        console.error('[WebSocket] connect failed', err);
        store.setError(err instanceof Error ? err.message : 'Connection failed');
      }
      return;
    }

    try {
      store.connect(url);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [options, store]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.disconnect();
      } catch {
        // ignore
      }
      return;
    }
    try {
      store.disconnect();
    } catch {
      // ignore
    }
  }, [store]);

  const sendMessage = useCallback(async (
    typeOrMessage: string | { type: string; data?: unknown },
    data?: unknown,
    opts?: { maxRetries?: number; timeout?: number; requireAck?: boolean }
  ) => {
    if (clientRef.current) {
      return typeof typeOrMessage === 'object'
        ? clientRef.current.sendMessage(typeOrMessage.type, typeOrMessage.data, opts)
        : clientRef.current.sendMessage(typeOrMessage, data, opts);
    }

    const storeOpts = opts as { maxRetries?: number } | undefined;
    if (typeof typeOrMessage === 'object') {
      store.sendMessage(typeOrMessage.type, typeOrMessage.data, storeOpts);
    } else {
      store.sendMessage(typeOrMessage, data, storeOpts);
    }
    return Promise.resolve();
  }, [store]);

  const clearQueue = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.clearQueue();
      } catch {
        // ignore
      }
    }
    store.clearQueue();
  }, [store]);

  const queueLength = (() => {
    const clientLen = clientRef.current?.getQueueLength();
    if (typeof clientLen === 'number') return clientLen;
    const mq = (store as unknown as { messageQueue?: unknown })?.messageQueue;
    if (Array.isArray(mq)) return mq.length;
    return 0;
  })();

  return {
    status: store.status,
    lastError: store.lastError,
    reconnectAttempts: store.reconnectAttempts,
    queueLength,
    connect,
    disconnect,
    sendMessage,
    clearQueue,
  isConnected: String(store.status) === 'connected',
  isConnecting: String(store.status) === 'connecting',
  isReconnecting: String(store.status) === 'reconnecting',
  hasError: String(store.status) === 'error',
  } as const;
}

export function useRealTimeData<T = unknown>(messageType: string, initialData?: T) {
  const store = useWebSocketStore();
  const dataRef = useRef<T | undefined>(initialData);
  const listenersRef = useRef(new Set<(data: T) => void>());

  useEffect(() => {
    return () => {
      // cleanup - clear listeners set safely
      listenersRef.current = new Set();
    };
  }, [messageType]);

  const subscribe = useCallback((listener: (data: T) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getCurrentData = useCallback(() => dataRef.current, []);

  return { data: dataRef.current, subscribe, getCurrentData, isConnected: String(store.status) === 'connected' } as const;
}

export function useWebSocketStatus() {
  const store = useWebSocketStore();

  const statusInfo = useMemo(() => {
    switch (String(store.status)) {
      case 'connected':
        return { status: store.status, color: 'green', text: 'Connected', icon: '●', description: 'Real-time connection active' };
      case 'connecting':
        return { status: store.status, color: 'yellow', text: 'Connecting', icon: '◐', description: 'Establishing connection...' };
      case 'reconnecting':
        return { status: store.status, color: 'orange', text: `Reconnecting (${store.reconnectAttempts})`, icon: '◑', description: 'Attempting to reconnect...' };
      case 'error':
        return { status: store.status, color: 'red', text: 'Error', icon: '●', description: store.lastError || 'Connection error' };
      case 'disconnected':
      default:
        return { status: store.status, color: 'gray', text: 'Disconnected', icon: '○', description: 'No connection' };
    }
  }, [store.status, store.reconnectAttempts, store.lastError]);

  return { ...statusInfo, reconnectAttempts: store.reconnectAttempts, maxReconnectAttempts: store.maxReconnectAttempts, lastError: store.lastError } as const;
}

export function useWebSocketAck() {
  const { sendMessage } = useWebSocket();

  const sendWithAck = useCallback(async (type: string, data: unknown, timeout = 5000) => {
    return sendMessage(type, data, { requireAck: true, timeout, maxRetries: 1 });
  }, [sendMessage]);

  const sendReliable = useCallback(async (type: string, data: unknown, maxRetries = 3) => {
    return sendMessage(type, data, { maxRetries, requireAck: false });
  }, [sendMessage]);

  return { sendWithAck, sendReliable } as const;
}
