import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { act } from '@testing-library/react';

// Mock the flow websocket factory. Create the mock inside the factory and
// export it as __mockSend so tests can import it dynamically after module
// initialization. This avoids ReferenceError caused by vi.mock hoisting.
vi.mock('@/hooks/useFlowWebSocket', () => {
  const __mockSend = vi.fn();
  return {
    default: () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendLocalPatch: __mockSend,
      handleMessage: vi.fn(),
    }),
    __mockSend,
  };
});

import { useFlowSyncStore } from '../flowSyncStore';

describe('flowSyncStore publishPatch debounce', () => {
  beforeEach(() => {
    // reset store
    useFlowSyncStore.setState({ connected: false, lastSent: undefined });
    vi.useRealTimers();
  });

  it('debounces rapid publishPatch calls and merges payloads', async () => {
    const api = useFlowSyncStore.getState();

    // Use fake timers to control debounce
    vi.useFakeTimers();

    // Fire two patches quickly for same view
    act(() => {
      api.publishPatch('daw', { nodeChanges: [{ id: 'n1' }] });
      api.publishPatch('daw', { edgeChanges: [{ id: 'e1' }] });
    });

  // Import the mocked module to grab the mock function we exported from
  // the mock factory. Use dynamic import so the mock is available.
  const wsMockModule = await import('@/hooks/useFlowWebSocket');
  const mockSend = wsMockModule.__mockSend as Mock;

  // At this point, no sendLocalPatch should yet have been called
  expect(mockSend).toHaveBeenCalledTimes(0);

    // Advance timers past debounce
    vi.advanceTimersByTime(200);

    // Now it should have been called once with merged payload
    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0];
    expect(callArgs[0]).toBe('daw');
    expect(callArgs[1]).toMatchObject({ nodeChanges: [{ id: 'n1' }], edgeChanges: [{ id: 'e1' }] });
  });
});
