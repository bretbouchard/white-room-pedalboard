import React, { useEffect } from 'react';
import { useWebSocketStore } from '@/stores/websocketStore';
import { useAuth } from '@clerk/clerk-react';
import { isAuthEnabled } from '@/providers/AuthProvider';

interface WebSocketAuthProviderProps {
  children: React.ReactNode;
}

function buildWsUrl(base: string, token?: string) {
  try {
    const url = new URL(base);
    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  } catch {
    // Fallback: naive concatenation
    if (token) {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}token=${encodeURIComponent(token)}`;
    }
    return base;
  }
}

export const WebSocketAuthProvider: React.FC<WebSocketAuthProviderProps> = ({ children }) => {
  const { connect, disconnect, status } = useWebSocketStore();
  const auth = isAuthEnabled ? useAuth() : undefined;

  useEffect(() => {
    // Skip WebSocket connection in local development mode
    const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';
    const bypassWsAuth = import.meta.env.VITE_WS_AUTH_BYPASS === 'true';

    if (useLocalStorage) {
      console.log('Local storage mode enabled, skipping WebSocket connection');
      return;
    }

    let mounted = true;
    const baseWsUrl = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:8350/ws';

    async function ensureConnection() {
      try {
        let token: string | null | undefined;

        if (!bypassWsAuth && isAuthEnabled && auth) {
          try {
            token = await auth.getToken({ template: 'default' });
          } catch (tokenError) {
            console.warn('Failed to obtain Clerk session token for WebSocket auth, attempting unauthenticated connection', tokenError);
          }
        }

        const url = buildWsUrl(baseWsUrl, token ?? undefined);
        if (mounted) {
          connect(url);
        }
      } catch {
        // Best-effort connect without token
        connect(baseWsUrl);
      }
    }

    // Connect on mount
    ensureConnection();

    return () => {
      mounted = false;
      if (status !== 'disconnected') {
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};

export default WebSocketAuthProvider;
