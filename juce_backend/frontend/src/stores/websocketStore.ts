import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export enum WebSocketStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface WebSocketMessage {
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
}

interface QueuedMessage extends WebSocketMessage {
  retries: number;
  maxRetries: number;
}

interface WebSocketState {
  status: WebSocketStatus;
  socket: WebSocket | null;
  lastError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  messageQueue: QueuedMessage[];
  lastHeartbeat: number;
  currentUrl: string | null;

  // Actions
  connect: (url?: string) => void;
  disconnect: () => void;
  sendMessage: (
    type: string,
    data: unknown,
    options?: { maxRetries?: number }
  ) => void;
  clearQueue: () => void;

  // Internal actions
  setStatus: (status: WebSocketStatus) => void;
  setError: (error: string | null) => void;
  addToQueue: (message: WebSocketMessage, maxRetries?: number) => void;
  removeFromQueue: (messageId: string) => void;
  processQueue: () => void;

  // Subscription for incoming messages
  subscribe: (handler: (message: WebSocketMessage) => void) => () => void;
}

const DEFAULT_WS_URL = 'ws://localhost:8350/ws';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 1000; // Start with 1 second
const MAX_RECONNECT_DELAY = 30000; // Max 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    (set, get) => {
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let reconnectTimeout: NodeJS.Timeout | null = null;
      const subscribers = new Set<(message: WebSocketMessage) => void>();

      const startHeartbeat = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        heartbeatInterval = setInterval(() => {
          const { socket, status } = get();
          if (socket && status === WebSocketStatus.CONNECTED) {
            socket.send(
              JSON.stringify({
                id: `heartbeat_${Date.now()}`,
                type: 'heartbeat',
                timestamp: Date.now(),
                data: {},
              })
            );

            set(
              state => ({ ...state, lastHeartbeat: Date.now() }),
              false,
              'websocket/heartbeat'
            );
          }
        }, HEARTBEAT_INTERVAL);
      };

      const stopHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      };

      const scheduleReconnect = () => {
        const { reconnectAttempts, maxReconnectAttempts, reconnectDelay } =
          get();

        if (reconnectAttempts >= maxReconnectAttempts) {
          set(
            state => ({ ...state, status: WebSocketStatus.ERROR }),
            false,
            'websocket/maxReconnectAttemptsReached'
          );
          return;
        }

        const delay = Math.min(
          reconnectDelay * Math.pow(2, reconnectAttempts),
          MAX_RECONNECT_DELAY
        );

        set(
          state => ({ ...state, status: WebSocketStatus.RECONNECTING }),
          false,
          'websocket/scheduleReconnect'
        );

        reconnectTimeout = setTimeout(() => {
          const { currentUrl } = get();
          get().connect(currentUrl ?? DEFAULT_WS_URL);
        }, delay);
      };

      return {
        status: WebSocketStatus.DISCONNECTED,
        socket: null,
        lastError: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectDelay: RECONNECT_DELAY,
        messageQueue: [],
        lastHeartbeat: 0,
        currentUrl: null,

        connect: (url) => {
          const { socket, status, currentUrl } = get();

          // Don't connect if already connected or connecting
          if (
            socket &&
            (status === WebSocketStatus.CONNECTED ||
              status === WebSocketStatus.CONNECTING)
          ) {
            return;
          }

          const targetUrl = url ?? currentUrl ?? DEFAULT_WS_URL;

          set(
            state => ({
              ...state,
              status: WebSocketStatus.CONNECTING,
              currentUrl: targetUrl,
            }),
            false,
            'websocket/connecting'
          );

          try {
            const newSocket = new WebSocket(targetUrl);

            newSocket.onopen = () => {
              console.log('WebSocket connected');

              set(
                state => ({
                  ...state,
                  status: WebSocketStatus.CONNECTED,
                  socket: newSocket,
                  lastError: null,
                  reconnectAttempts: 0,
                  currentUrl: targetUrl,
                }),
                false,
                'websocket/connected'
              );

              startHeartbeat();
              get().processQueue();
            };

            newSocket.onmessage = event => {
              try {
                const message = JSON.parse(event.data) as WebSocketMessage;

                // Handle heartbeat response
                if (message.type === 'heartbeat_response') {
                  return;
                }

                // Handle other messages (would integrate with other stores)
                console.log('Received WebSocket message:', message);

                // Fan out to subscribers
                subscribers.forEach((fn) => {
                  try { fn(message); } catch { /* ignore */ }
                });

                // Remove message from queue if it was a response to a queued message
                if (message.id) {
                  get().removeFromQueue(message.id);
                }
              } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
              }
            };

            newSocket.onclose = event => {
              console.log('WebSocket disconnected:', event.code, event.reason);

              stopHeartbeat();

              set(
                state => ({
                  ...state,
                  socket: null,
                  status: WebSocketStatus.DISCONNECTED,
                }),
                false,
                'websocket/disconnected'
              );

              // Auto-reconnect unless it was a manual disconnect
              if (event.code !== 1000) {
                scheduleReconnect();
              }
            };

            newSocket.onerror = error => {
              console.error('WebSocket error:', error);

              set(
                state => ({
                  ...state,
                  lastError: 'Connection error',
                  reconnectAttempts: state.reconnectAttempts + 1,
                }),
                false,
                'websocket/error'
              );
            };
          } catch (error) {
            console.error('Failed to create WebSocket:', error);

            set(
              state => ({
                ...state,
                status: WebSocketStatus.ERROR,
                lastError:
                  error instanceof Error ? error.message : 'Unknown error',
              }),
              false,
              'websocket/createError'
            );
          }
        },

        disconnect: () => {
          const { socket } = get();

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          stopHeartbeat();

          if (socket) {
            socket.close(1000, 'Manual disconnect');
          }

          set(
            state => ({
              ...state,
              socket: null,
              status: WebSocketStatus.DISCONNECTED,
              reconnectAttempts: 0,
            }),
            false,
            'websocket/manualDisconnect'
          );
        },

        sendMessage: (type: string, data: unknown, options = {}) => {
          const { socket, status } = get();
          const { maxRetries = 3 } = options;

          const message: WebSocketMessage = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            timestamp: new Date().toISOString(),
            data,
          };

          if (socket && status === WebSocketStatus.CONNECTED) {
            try {
              socket.send(JSON.stringify(message));
              console.log('Sent WebSocket message:', message);
            } catch (error) {
              console.error('Failed to send WebSocket message:', error);
              get().addToQueue(message, maxRetries);
            }
          } else {
            // Queue message for later
            get().addToQueue(message, maxRetries);
          }
        },

        clearQueue: () => {
          set(
            state => ({ ...state, messageQueue: [] }),
            false,
            'websocket/clearQueue'
          );
        },

        setStatus: (status: WebSocketStatus) => {
          set(state => ({ ...state, status }), false, 'websocket/setStatus');
        },

        setError: (error: string | null) => {
          set(
            state => ({ ...state, lastError: error }),
            false,
            'websocket/setError'
          );
        },

        addToQueue: (message: WebSocketMessage, maxRetries = 3) => {
          const queuedMessage: QueuedMessage = {
            ...message,
            retries: 0,
            maxRetries,
          };

          set(
            state => ({
              ...state,
              messageQueue: [...state.messageQueue, queuedMessage],
            }),
            false,
            'websocket/addToQueue'
          );
        },

        removeFromQueue: (messageId: string) => {
          set(
            state => ({
              ...state,
              messageQueue: state.messageQueue.filter(
                msg => msg.id !== messageId
              ),
            }),
            false,
            'websocket/removeFromQueue'
          );
        },

        processQueue: () => {
          const { socket, status, messageQueue } = get();

          if (
            !socket ||
            status !== WebSocketStatus.CONNECTED ||
            messageQueue.length === 0
          ) {
            return;
          }

          const messagesToProcess = [...messageQueue];

          messagesToProcess.forEach(queuedMessage => {
            try {
              socket.send(JSON.stringify(queuedMessage));
              console.log('Sent queued WebSocket message:', queuedMessage);
              get().removeFromQueue(queuedMessage.id);
            } catch (error) {
              console.error('Failed to send queued message:', error);

              // Increment retry count
              if (queuedMessage.retries < queuedMessage.maxRetries) {
                set(
                  state => ({
                    ...state,
                    messageQueue: state.messageQueue.map(msg =>
                      msg.id === queuedMessage.id
                        ? { ...msg, retries: msg.retries + 1 }
                        : msg
                    ),
                  }),
                  false,
                  'websocket/incrementRetry'
                );
              } else {
                // Remove message if max retries exceeded
                get().removeFromQueue(queuedMessage.id);
                console.warn('Message exceeded max retries:', queuedMessage);
              }
            }
          });
        },

        subscribe: (handler: (message: WebSocketMessage) => void) => {
          subscribers.add(handler);
          return () => subscribers.delete(handler);
        },
      };
    },
    { name: 'WebSocketStore' }
  )
);
