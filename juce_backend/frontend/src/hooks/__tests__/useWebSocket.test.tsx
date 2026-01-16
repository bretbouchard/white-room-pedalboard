/**
 * Tests for WebSocket hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Helper to wait for the hook's async client initialization (dynamic import in useEffect)
const waitClientInit = async (timeout = 200) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // Try to import the mocked utils module and check if its WebSocketClient mock was called
    try {
       
      const wsMod = await import('../../utils/WebSocketClient');
      const ctor = (wsMod as any).WebSocketClient;
      if (ctor && ctor.mock && ctor.mock.calls && ctor.mock.calls.length > 0) {
        return;
      }
    } catch (e) {
      // ignore import errors while mocking is being set up
    }
    // yield to event loop
     
    await act(async () => new Promise((res) => setTimeout(res, 5)));
  }
  // timeout expired; tests may fail if client not initialized
};

// Mock the WebSocket store (must be set before importing hooks)
type MockWebSocketStore = {
  status: string;
  lastError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  setStatus: ReturnType<typeof vi.fn>;
  setError: ReturnType<typeof vi.fn>;
  clearQueue: ReturnType<typeof vi.fn>;
};

const mockStore: MockWebSocketStore = {
  status: 'disconnected',
  lastError: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  setStatus: vi.fn(),
  setError: vi.fn(),
  clearQueue: vi.fn(),
};

vi.mock('../../stores/websocketStore', () => ({
  useWebSocketStore: () => mockStore,
}));

// Mock WebSocketClient used by the hooks - mock before importing hooks
type MockClient = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  clearQueue: ReturnType<typeof vi.fn>;
  getQueueLength: ReturnType<typeof vi.fn>;
  getStatus: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
};

const mockClient: MockClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendMessage: vi.fn(),
  clearQueue: vi.fn(),
  getQueueLength: vi.fn(() => 0),
  getStatus: vi.fn(() => 'disconnected'),
  on: vi.fn(),
  off: vi.fn(),
};

// The hook imports the utils module via a path that resolves from the hooks folder.
// From this test file the correct relative path to the module is '../../utils/WebSocketClient'.
vi.mock('../../utils/WebSocketClient', () => ({
  WebSocketClient: vi.fn(() => mockClient),
  WebSocketStatus: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
  },
}));

// We'll dynamically import the hooks after mocks are registered to ensure mocking
// happens before the module's import-analysis runs.
type UseWebSocketReturn = {
  status: string;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  hasError: boolean;
  connect: () => Promise<void> | void;
  disconnect: () => void;
  sendMessage: (topic: string, payload: unknown, opts?: unknown) => Promise<void>;
  clearQueue: () => void;
};

type UseWebSocketStatusReturn = any; // keep flexible for now
type UseRealTimeDataReturn = any;
type UseWebSocketAckReturn = any;

let useWebSocket: () => UseWebSocketReturn;
let useWebSocketStatus: () => UseWebSocketStatusReturn;
let useRealTimeData: (...args: any[]) => UseRealTimeDataReturn;
let useWebSocketAck: () => UseWebSocketAckReturn;

beforeEach(async () => {
  // Dynamically import module under test after mocks are active
  const mod = await import('../useWebSocket');
  useWebSocket = mod.useWebSocket;
  useWebSocketStatus = mod.useWebSocketStatus;
  useRealTimeData = mod.useRealTimeData;
  useWebSocketAck = mod.useWebSocketAck;
});

// Local enum mirror to avoid importing the real WebSocketClient in tests
const WebSocketStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
} as const;

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.status = WebSocketStatus.DISCONNECTED;
    mockStore.lastError = null;
    mockStore.reconnectAttempts = 0;
  });

  it('should initialize WebSocket client', () => {
    const { result } = renderHook(() => useWebSocket());
    
    expect(result.current.status).toBe(WebSocketStatus.DISCONNECTED);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should connect to WebSocket', async () => {
    mockClient.connect.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useWebSocket());
    await waitClientInit();
    await act(async () => {
      await result.current.connect();
    });
    
    expect(mockClient.connect).toHaveBeenCalled();
  });

  it('should disconnect from WebSocket', () => {
    const { result } = renderHook(() => useWebSocket());
    // ensure client initialized
    return waitClientInit().then(() => {
      act(() => {
        result.current.disconnect();
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  it('should send messages', async () => {
    mockClient.sendMessage.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useWebSocket());
    await waitClientInit();
    await act(async () => {
      await result.current.sendMessage('test', { data: 'test' });
    });
    
    expect(mockClient.sendMessage).toHaveBeenCalledWith('test', { data: 'test' }, undefined);
  });

  it('should handle connection errors', async () => {
    const error = new Error('Connection failed');
    mockClient.connect.mockRejectedValue(error);
    
    const { result } = renderHook(() => useWebSocket());
    await waitClientInit();
    await act(async () => {
      try {
        await result.current.connect();
      } catch {
        // Expected to throw
      }
    });
    
    expect(mockStore.setError).toHaveBeenCalledWith('Connection failed');
  });

  it('should clear message queue', () => {
    const { result } = renderHook(() => useWebSocket());
    return waitClientInit().then(() => {
      act(() => {
        result.current.clearQueue();
      });

      expect(mockClient.clearQueue).toHaveBeenCalled();
      expect(mockStore.clearQueue).toHaveBeenCalled();
    });
  });

  it('should reflect connection status changes', () => {
    const { result, rerender } = renderHook(() => useWebSocket());
    
    expect(result.current.isConnected).toBe(false);
    
    // Simulate status change
    mockStore.status = WebSocketStatus.CONNECTED;
    rerender();
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });
});

describe('useWebSocketStatus', () => {
  beforeEach(() => {
    mockStore.status = WebSocketStatus.DISCONNECTED;
    mockStore.lastError = null;
    mockStore.reconnectAttempts = 0;
  });

  it('should return correct status info for disconnected state', () => {
    const { result } = renderHook(() => useWebSocketStatus());
    
    expect(result.current.status).toBe(WebSocketStatus.DISCONNECTED);
    expect(result.current.color).toBe('gray');
    expect(result.current.text).toBe('Disconnected');
    expect(result.current.icon).toBe('○');
  });

  it('should return correct status info for connected state', () => {
    mockStore.status = WebSocketStatus.CONNECTED;
    
    const { result } = renderHook(() => useWebSocketStatus());
    
    expect(result.current.status).toBe(WebSocketStatus.CONNECTED);
    expect(result.current.color).toBe('green');
    expect(result.current.text).toBe('Connected');
    expect(result.current.icon).toBe('●');
  });

  it('should return correct status info for connecting state', () => {
    mockStore.status = WebSocketStatus.CONNECTING;
    
    const { result } = renderHook(() => useWebSocketStatus());
    
    expect(result.current.status).toBe(WebSocketStatus.CONNECTING);
    expect(result.current.color).toBe('yellow');
    expect(result.current.text).toBe('Connecting');
    expect(result.current.icon).toBe('◐');
  });

  it('should return correct status info for reconnecting state', () => {
    mockStore.status = WebSocketStatus.RECONNECTING;
    mockStore.reconnectAttempts = 2;
    
    const { result } = renderHook(() => useWebSocketStatus());
    
    expect(result.current.status).toBe(WebSocketStatus.RECONNECTING);
    expect(result.current.color).toBe('orange');
    expect(result.current.text).toBe('Reconnecting (2)');
    expect(result.current.icon).toBe('◑');
  });

  it('should return correct status info for error state', () => {
    mockStore.status = WebSocketStatus.ERROR;
    mockStore.lastError = 'Connection timeout';
    
    const { result } = renderHook(() => useWebSocketStatus());
    
    expect(result.current.status).toBe(WebSocketStatus.ERROR);
    expect(result.current.color).toBe('red');
    expect(result.current.text).toBe('Error');
    expect(result.current.description).toBe('Connection timeout');
  });
});

describe('useRealTimeData', () => {
  it('should initialize with initial data', () => {
    const initialData = { value: 42 };
    
    const { result } = renderHook(() => useRealTimeData('test_message', initialData));
    
    expect(result.current.data).toEqual(initialData);
    expect(result.current.getCurrentData()).toEqual(initialData);
  });

  it('should provide subscription mechanism', () => {
    const { result } = renderHook(() => useRealTimeData('test_message'));
    
    const mockListener = vi.fn();
    const unsubscribe = result.current.subscribe(mockListener);
    
    expect(typeof unsubscribe).toBe('function');
    
    // Test unsubscribe
    unsubscribe();
  });

  it('should reflect connection status', () => {
    mockStore.status = WebSocketStatus.CONNECTED;
    
    const { result } = renderHook(() => useRealTimeData('test_message'));
    
    expect(result.current.isConnected).toBe(true);
  });
});

describe('useWebSocketAck', () => {
  beforeEach(() => {
    mockClient.sendMessage.mockResolvedValue(undefined);
  });

  it('should send message with acknowledgment', async () => {
    const { result } = renderHook(() => useWebSocketAck());
    await waitClientInit();
    await act(async () => {
      await result.current.sendWithAck('test', { data: 'test' });
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith('test', { data: 'test' }, {
      requireAck: true,
      timeout: 5000,
      maxRetries: 1,
    });
  });

  it('should send reliable message', async () => {
    const { result } = renderHook(() => useWebSocketAck());
    await waitClientInit();
    await act(async () => {
      await result.current.sendReliable('test', { data: 'test' });
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith('test', { data: 'test' }, {
      maxRetries: 3,
      requireAck: false,
    });
  });

  it('should handle custom timeout for acknowledgment', async () => {
    const { result } = renderHook(() => useWebSocketAck());
    await waitClientInit();
    await act(async () => {
      await result.current.sendWithAck('test', { data: 'test' }, 10000);
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith('test', { data: 'test' }, {
      requireAck: true,
      timeout: 10000,
      maxRetries: 1,
    });
  });

  it('should handle custom retry count for reliable messages', async () => {
    const { result } = renderHook(() => useWebSocketAck());
    await waitClientInit();
    await act(async () => {
      await result.current.sendReliable('test', { data: 'test' }, 5);
    });

    expect(mockClient.sendMessage).toHaveBeenCalledWith('test', { data: 'test' }, {
      maxRetries: 5,
      requireAck: false,
    });
  });
});