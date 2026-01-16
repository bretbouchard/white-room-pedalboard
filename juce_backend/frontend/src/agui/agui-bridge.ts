import { useEffect, useRef, useState, useCallback } from 'react';
import { processEventForAlerts } from './utils/alerting'; // Import alerting utility
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { mapAGUIEventToCopilotKit } from './agui-mapping';

/**
 * Custom error class for AG-UI connection-related issues.
 */
export class AGUIConnectionError extends Error {
  constructor(
    message: string,
    public originalEvent?: Event
  ) {
    super(message);
    this.name = 'AGUIConnectionError';
  }
}

/**
 * Custom error class for AG-UI event parsing failures.
 */
export class AGUIParseError extends Error {
  constructor(
    message: string,
    public rawData: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AGUIParseError';
  }
}

/**
 * Custom error class for unhandled AG-UI event types.
 */
export class AGUIUnhandledEventError extends Error {
  constructor(
    message: string,
    public eventType: string,
    public payload: any
  ) {
    super(message);
    this.name = 'AGUIUnhandledEventError';
  }
}

/**
 * Represents a generic AG-UI event.
 */
export interface AGUIEvent {
  type: string;
  payload?: any;
  timestamp: number; // Add timestamp for history and alerting
  version?: string; // Add version field for schema management
  [key: string]: any;
}

/**
 * Options for the useAGUIBridge hook.
 */
interface AGUIBridgeOptions {
  streamUrl: string;
  onEvent: (
    event:
      | AGUIEvent
      | AGUIConnectionError
      | AGUIParseError
      | AGUIUnhandledEventError
  ) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (
    error: AGUIConnectionError | AGUIParseError | AGUIUnhandledEventError
  ) => void;
  heartbeatIntervalMs?: number; // Expected interval for server heartbeats
  heartbeatTimeoutMultiplier?: number; // How many intervals to wait before declaring timeout
}

const RECONNECT_INTERVAL_MS = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15000; // Default server heartbeat interval
const DEFAULT_HEARTBEAT_TIMEOUT_MULTIPLIER = 2; // Wait for 2 intervals before timeout
const DEDUPLICATION_WINDOW_MS = 500; // Deduplicate events with identical data within this window
const EVENT_HISTORY_LIMIT = 100; // Keep last 100 events for alerting context

/**
 * A React hook for establishing and managing a Server-Sent Events (SSE) connection
 * to the AG-UI stream. It handles reconnection logic, heartbeat validation, and basic
 * client-side event deduplication.
 *
 * @param {AGUIBridgeOptions} options - Configuration options for the bridge.
 * @returns {{ isConnected: boolean, connect: () => void, disconnect: () => void }} An object indicating the current connection status and control functions.
 *
 * @remarks
 * This implementation uses Server-Sent Events (SSE) for unidirectional communication (server to client).
 * For bidirectional communication (client to server and vice-versa), WebSockets would be a more suitable choice.
 * The decision between SSE and WebSockets depends on the specific communication needs of the application.
 * TODO: Re-evaluate the choice between SSE and WebSockets based on evolving performance requirements and bidirectional communication needs.
 */
export const useAGUIBridge = ({
  streamUrl,
  onEvent,
  onConnect,
  onDisconnect,
  onError,
  heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  heartbeatTimeoutMultiplier = DEFAULT_HEARTBEAT_TIMEOUT_MULTIPLIER,
}: AGUIBridgeOptions) => {
  // Initialize CopilotKit integrations safely (handle cases where CopilotKit is not available)
  let copilotAction = null;
  let copilotReadable = null;

  try {
    copilotAction =
      useCopilotAction && (useCopilotAction as unknown as () => any)();
    copilotReadable =
      useCopilotReadable && (useCopilotReadable as unknown as () => any)();
  } catch {
    // CopilotKit not available, continue without it
    console.debug(
      'AGUI Bridge: CopilotKit not available, running without AI integration'
    );
  }

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  // Track if the disconnect was triggered manually so we don't attempt to
  // reconnect after an explicit user-initiated disconnect()
  const manualDisconnect = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const lastHeartbeat = useRef(Date.now());
  const heartbeatTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedEvent = useRef<{ data: string; timestamp: number } | null>(
    null
  );
  const eventHistory = useRef<AGUIEvent[]>([]); // Store recent events for alerting

  const addEventToHistory = useCallback((event: AGUIEvent) => {
    eventHistory.current.push(event);
    if (eventHistory.current.length > EVENT_HISTORY_LIMIT) {
      eventHistory.current.shift(); // Remove oldest event
    }
  }, []);

  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutId.current) {
      clearTimeout(heartbeatTimeoutId.current);
    }
    heartbeatTimeoutId.current = setTimeout(() => {
      console.log(
        'Heartbeat timeout callback fired.',
        'eventSourceRef.current:',
        eventSourceRef.current,
        'isConnected:',
        isConnected
      );
      if (eventSourceRef.current && isConnected) {
        console.warn(
          'AG-UI Bridge: Heartbeat timeout. Attempting to reconnect.'
        );
        const connectionError = new AGUIConnectionError('Heartbeat timeout');
        onEvent(connectionError);
        onError?.(connectionError);
        processEventForAlerts(connectionError, eventHistory.current); // Alert on connection error
        eventSourceRef.current.close();
      }
    }, heartbeatIntervalMs * heartbeatTimeoutMultiplier);
  }, [
    heartbeatIntervalMs,
    heartbeatTimeoutMultiplier,
    isConnected,
    onEvent,
    onError,
    eventHistory,
  ]);

  const processIncomingEvent = useCallback(
    (event: MessageEvent) => {
      const currentEventData = event.data;
      const now = Date.now();

      if (
        lastProcessedEvent.current &&
        lastProcessedEvent.current.data === currentEventData &&
        now - lastProcessedEvent.current.timestamp < DEDUPLICATION_WINDOW_MS
      ) {
        console.debug(
          'AG-UI Bridge: Skipping duplicate event within deduplication window.',
          currentEventData
        );
        return;
      }

      if (currentEventData === ': heartbeat') {
        lastHeartbeat.current = now;
        resetHeartbeatTimeout();
        return;
      }

      try {
        const data = JSON.parse(currentEventData);
        const aguiEvent: AGUIEvent = {
          type: event.type,
          payload: data,
          timestamp: now,
        };
        onEvent(aguiEvent);
        addEventToHistory(aguiEvent);
        processEventForAlerts(aguiEvent, eventHistory.current);

        // Map events to CopilotKit actions/readables and register/update as needed
        try {
          const mapped = mapAGUIEventToCopilotKit(aguiEvent);
          if (mapped) {
            // Action-like mapped objects have 'name' and 'parameters'
            if ((mapped as any).name && (mapped as any).parameters) {
              // Normalize parameters: if object, convert to array form expected by CopilotKit
              const rawParams = (mapped as any).parameters;
              const paramsArray = Array.isArray(rawParams)
                ? rawParams
                : rawParams && typeof rawParams === 'object'
                  ? Object.keys(rawParams).map(k => ({
                      name: k,
                      description: undefined,
                    }))
                  : [];
              // Use the CopilotKit action API if available
              copilotAction?.register?.({
                name: (mapped as any).name,
                description:
                  (mapped as any).description ?? String((mapped as any).name),
                parameters: paramsArray,
                handler: (args: any) => {
                  // No-op handler for tests; real implementation might call execute
                  copilotAction?.execute?.(args);
                },
              });
            } else if (
              (mapped as any).description &&
              Object.prototype.hasOwnProperty.call(mapped as any, 'value')
            ) {
              // Readable-like mapped objects
              copilotReadable?.update?.({
                name: aguiEvent.type,
                value: (mapped as any).value,
                description: (mapped as any).description,
              });
            }
          } else {
            // Fallback heuristics: tool_* event types -> register an action; dotted types -> readable update
            if (
              aguiEvent.type &&
              String(aguiEvent.type).toLowerCase().includes('tool')
            ) {
              const params =
                aguiEvent.payload && typeof aguiEvent.payload === 'object'
                  ? Object.keys(aguiEvent.payload).map(k => ({ name: k }))
                  : [];
              copilotAction?.register?.({
                name: aguiEvent.type,
                description: `AGUI action ${aguiEvent.type}`,
                parameters: params,
                handler: (args: any) => copilotAction?.execute?.(args),
              });
            } else if (
              typeof aguiEvent.type === 'string' &&
              aguiEvent.type.includes('.')
            ) {
              copilotReadable?.update?.({
                name: aguiEvent.type,
                value: aguiEvent.payload,
                description: `AGUI readable ${aguiEvent.type}`,
              });
            }
          }
        } catch (mapErr) {
          // mapping errors shouldn't crash the bridge
          console.error('AG-UI Bridge: mapping error', mapErr);
        }

        lastHeartbeat.current = now;
        resetHeartbeatTimeout();
        lastProcessedEvent.current = { data: currentEventData, timestamp: now };
      } catch (e: any) {
        const parseError = new AGUIParseError(
          'Error parsing message data',
          currentEventData,
          e
        );
        console.error('AG-UI Bridge:', parseError);
        onEvent(parseError);
        onError?.(parseError);
        processEventForAlerts(parseError, eventHistory.current);
      }
    },
    [onEvent, onError, resetHeartbeatTimeout, addEventToHistory, eventHistory]
  );

  const connect = useCallback(() => {
    // Clear manualDisconnect when establishing a connection via connect()
    manualDisconnect.current = false;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (heartbeatTimeoutId.current) {
      clearTimeout(heartbeatTimeoutId.current);
    }

    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('AG-UI Bridge: EventSource onopen triggered.');
      console.log('AG-UI Bridge: Connected to stream.');
      setIsConnected(true);
      console.log('AG-UI Bridge: isConnected set to true.', isConnected);
      reconnectAttempts.current = 0;
      lastHeartbeat.current = Date.now();
      resetHeartbeatTimeout();
      onConnect?.();
    };

    es.onmessage = processIncomingEvent;

    es.addEventListener('ready', processIncomingEvent);
    es.addEventListener('tool_call', processIncomingEvent);
    es.addEventListener('state_patch', processIncomingEvent);

    es.onerror = errorEvent => {
      const connectionError = new AGUIConnectionError(
        'EventSource connection error',
        errorEvent
      );
      console.error('AG-UI Bridge:', connectionError);
      setIsConnected(false);
      console.log('AG-UI Bridge: isConnected set to false.', isConnected);
      onEvent(connectionError);
      onError?.(connectionError);
      processEventForAlerts(connectionError, eventHistory.current); // Alert on connection error

      if (heartbeatTimeoutId.current) {
        clearTimeout(heartbeatTimeoutId.current);
      }

      // Only schedule reconnects if we haven't been manually disconnected.
      if (!manualDisconnect.current) {
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          console.log(
            `AG-UI Bridge: Attempting to reconnect (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );
          const delay =
            RECONNECT_INTERVAL_MS * Math.pow(2, reconnectAttempts.current - 1) +
            Math.random() * 1000;
          setTimeout(() => {
            // guard again at timeout time
            if (!manualDisconnect.current) {
              connect();
            }
          }, delay);
        } else {
          console.error(
            'AG-UI Bridge: Max reconnect attempts reached. Giving up.'
          );
          onDisconnect?.();
        }
      } else {
        console.log(
          'AG-UI Bridge: Manual disconnect in effect; skipping scheduled reconnect.'
        );
      }
    };
  }, [
    streamUrl,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    processIncomingEvent,
    heartbeatIntervalMs,
    heartbeatTimeoutMultiplier,
    resetHeartbeatTimeout,
    eventHistory,
  ]);

  const disconnect = useCallback(() => {
    // Mark manual disconnect so any pending reconnect timers will not restart
    manualDisconnect.current = true;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      if (heartbeatTimeoutId.current) {
        clearTimeout(heartbeatTimeoutId.current);
      }
      setIsConnected(false);
      onDisconnect?.();
    }
  }, [onDisconnect]);

  useEffect(() => {
    console.log('AG-UI Bridge: useEffect mount. Calling connect().');
    connect();

    return () => {
      console.log(
        'AG-UI Bridge: useEffect unmount. Disconnecting from stream.'
      );
      if (eventSourceRef.current) {
        console.log('AG-UI Bridge: Closing EventSource.');
        eventSourceRef.current.close();
        if (heartbeatTimeoutId.current) {
          clearTimeout(heartbeatTimeoutId.current);
        }
        onDisconnect?.();
      }
    };
  }, [connect, onDisconnect]);

  return { isConnected, connect, disconnect };
};
