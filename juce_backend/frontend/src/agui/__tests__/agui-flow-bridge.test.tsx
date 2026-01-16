import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import {
  useAGUIFlowBridge,
  createNodeSuggestion,
  createConnectionSuggestion,
} from '../agui-flow-bridge';
import type { FlowSuggestionEvent } from '../agui-flow-bridge';

// Mock stores
vi.mock('@/stores/flowStore', () => ({
  useFlowStore: {
    getState: () => ({
      activeView: 'daw',
      daw: { nodes: [], edges: [] },
      theory: { nodes: [], edges: [] },
      selectedNodeId: undefined,
      hierarchy: [],
      addNode: vi.fn().mockReturnValue({ id: 'new-node-id' }),
      addEdge: vi.fn().mockReturnValue({ id: 'new-edge-id' }),
      updateNodeData: vi.fn(),
    }),
  },
}));

vi.mock('@/stores/flowSyncStore', () => ({
  useFlowSyncStore: {
    getState: () => ({
      publishPatch: vi.fn(),
      flush: vi.fn(),
    }),
  },
}));

// Mock fetch globally
global.fetch = vi.fn() as any;

describe('useAGUIFlowBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAGUIFlowBridge());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.activeSuggestions).toBeInstanceOf(Map);
    expect(result.current.suggestionHistory).toEqual([]);
    expect(typeof result.current.acceptSuggestion).toBe('function');
    expect(typeof result.current.rejectSuggestion).toBe('function');
    expect(typeof result.current.requestSuggestions).toBe('function');
    expect(typeof result.current.requestContextualSuggestions).toBe('function');
    expect(typeof result.current.cleanup).toBe('function');
  });

  it('handles node suggestion events', () => {
    const { result } = renderHook(() =>
      useAGUIFlowBridge({
        onSuggestion: vi.fn(),
      })
    );

    const mockEvent: FlowSuggestionEvent = {
      id: 'test-suggestion-1',
      type: 'node-suggestion',
      timestamp: Date.now(),
      payload: {
        confidence: 0.8,
        reasoning: 'Add a track for better arrangement',
        suggestion: {
          nodeType: 'track',
          position: { x: 100, y: 200 },
          data: { trackType: 'audio' },
          reason: 'Improve arrangement',
        },
      },
    };

    // Simulate receiving a suggestion
    act(() => {
      // Access private method through event handler simulation
      const eventHandler = (result.current as any).handleAGUIEvent;
      if (eventHandler) {
        eventHandler(mockEvent);
      }
    });

    expect(result.current.activeSuggestions.size).toBe(1);
    expect(result.current.activeSuggestions.has('test-suggestion-1')).toBe(
      true
    );
  });

  it('accepts node suggestions correctly', async () => {
    const mockPublishPatch = vi.fn();
    const mockAddNode = vi.fn().mockReturnValue({ id: 'new-track-id' });

    vi.mocked(useFlowStore).getState = vi.fn().mockReturnValue({
      activeView: 'daw',
      daw: { nodes: [], edges: [] },
      theory: { nodes: [], edges: [] },
      selectedNodeId: undefined,
      hierarchy: [],
      addNode: mockAddNode,
      addEdge: vi.fn(),
      updateNodeData: vi.fn(),
    });

    vi.mocked(useFlowSyncStore).getState = vi.fn().mockReturnValue({
      publishPatch: mockPublishPatch,
      flush: vi.fn(),
    });

    const { result } = renderHook(() => useAGUIFlowBridge());

    const suggestion = createNodeSuggestion(
      'track',
      { x: 100, y: 200 },
      { trackType: 'audio' },
      0.8,
      'Add audio track'
    );

    // Add suggestion to active suggestions
    act(() => {
      const eventHandler = (result.current as any).handleAGUIEvent;
      if (eventHandler) {
        eventHandler({ ...suggestion, id: 'test-suggestion-2' });
      }
    });

    // Accept suggestion
    act(() => {
      result.current.acceptSuggestion('test-suggestion-2');
    });

    expect(mockAddNode).toHaveBeenCalledWith({
      type: 'track',
      position: { x: 100, y: 200 },
      data: {
        trackType: 'audio',
        order: 0,
        path: [],
      },
    });

    expect(mockPublishPatch).toHaveBeenCalledWith('daw', {
      addedNodes: [{ id: 'new-track-id' }],
    });
  });

  it('rejects suggestions and moves them to history', () => {
    const { result } = renderHook(() =>
      useAGUIFlowBridge({
        onUserFeedback: vi.fn(),
      })
    );

    const suggestion = createConnectionSuggestion(
      'node-1',
      'node-2',
      'signal',
      0.7,
      'Connect for signal flow'
    );

    // Add suggestion to active suggestions
    act(() => {
      const eventHandler = (result.current as any).handleAGUIEvent;
      if (eventHandler) {
        eventHandler({ ...suggestion, id: 'test-suggestion-3' });
      }
    });

    expect(result.current.activeSuggestions.size).toBe(1);

    // Reject suggestion
    act(() => {
      result.current.rejectSuggestion(
        'test-suggestion-3',
        'Not needed for current workflow'
      );
    });

    expect(result.current.activeSuggestions.size).toBe(0);
    expect(result.current.suggestionHistory).toHaveLength(1);
    expect(result.current.suggestionHistory[0].id).toBe('test-suggestion-3');
  });

  it('requests suggestions with context', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        suggestions: [],
        count: 0,
      }),
    } as Response);

    const { result } = renderHook(() => useAGUIFlowBridge());

    // Request suggestions
    act(() => {
      result.current.requestSuggestions('node-suggestion');
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/agui/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"type":"node-suggestion"'),
      });
    });
  });

  it('cleans up timeouts on cleanup', () => {
    const { result, unmount } = renderHook(() => useAGUIFlowBridge());

    // Add a suggestion to create a timeout
    const suggestion = createNodeSuggestion(
      'track',
      { x: 0, y: 0 },
      {},
      0.5,
      'Test suggestion'
    );

    act(() => {
      const eventHandler = (result.current as any).handleAGUIEvent;
      if (eventHandler) {
        eventHandler({ ...suggestion, id: 'cleanup-test' });
      }
    });

    expect(result.current.activeSuggestions.size).toBe(1);

    // Call cleanup
    act(() => {
      result.current.cleanup();
    });

    // Cleanup should remove timeouts but keep active suggestions
    expect(result.current.activeSuggestions.size).toBe(1);

    unmount();
  });

  it('generates contextual suggestions based on flow state', () => {
    const mockFlowStore = {
      activeView: 'daw',
      daw: { nodes: [{ type: 'song' }], edges: [] },
      theory: { nodes: [], edges: [] },
      selectedNodeId: undefined,
      hierarchy: [],
    };

    vi.mocked(useFlowStore).getState = vi.fn().mockReturnValue(mockFlowStore);

    const { result } = renderHook(() =>
      useAGUIFlowBridge({
        enableSmartSuggestions: true,
        isConnected: true,
      })
    );

    // Request contextual suggestions
    act(() => {
      result.current.requestContextualSuggestions();
    });

    // Should detect song exists and suggest tracks
    expect(fetch).toHaveBeenCalledWith('/api/agui/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"type":"node-suggestion"'),
    });
  });
});

describe('Utility Functions', () => {
  it('creates node suggestions correctly', () => {
    const suggestion = createNodeSuggestion(
      'track',
      { x: 150, y: 300 },
      { trackType: 'instrument', instrument: 'piano' },
      0.9,
      'Add piano track for melody'
    );

    expect(suggestion.type).toBe('node-suggestion');
    expect(suggestion.payload.confidence).toBe(0.9);
    expect(suggestion.payload.reasoning).toBe('Add piano track for melody');
    expect(suggestion.payload.suggestion.nodeType).toBe('track');
    expect(suggestion.payload.suggestion.position).toEqual({ x: 150, y: 300 });
    expect(suggestion.payload.suggestion.data.trackType).toBe('instrument');
    expect(suggestion.payload.suggestion.data.instrument).toBe('piano');
  });

  it('creates connection suggestions correctly', () => {
    const suggestion = createConnectionSuggestion(
      'track-1',
      'track-2',
      'signal',
      0.8,
      'Connect tracks for signal routing'
    );

    expect(suggestion.type).toBe('connection-recommendation');
    expect(suggestion.payload.confidence).toBe(0.8);
    expect(suggestion.payload.reasoning).toBe(
      'Connect tracks for signal routing'
    );
    expect(suggestion.payload.suggestion.sourceId).toBe('track-1');
    expect(suggestion.payload.suggestion.targetId).toBe('track-2');
    expect(suggestion.payload.suggestion.connectionType).toBe('signal');
  });
});
