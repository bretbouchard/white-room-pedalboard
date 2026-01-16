import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AudioEngineControls } from '../AudioEngineControls';
import { AudioNodeInspector } from '../AudioNodeInspector';
import { AudioVisualizer } from '../AudioVisualizer';
import { getAudioEngine, getAudioEngineClient, getAudioRoutingManager } from '@/lib/audio-engine';
import { useAudioEngineStore } from '@/lib/audio-engine/AudioEngineStore';

// Mock the audio engine modules
vi.mock('@/lib/audio-engine/AudioEngine', () => ({
  getAudioEngine: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    play: vi.fn(),
    stop: vi.fn(),
    getEngineStatus: vi.fn(() => ({
      isInitialized: true,
      isPlaying: false,
      currentTime: 0,
      sampleRate: 44100,
      bufferSize: 512,
      contextState: 'running',
      nodeCount: 0,
    })),
    dispose: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/audio-engine/AudioEngineClient', () => ({
  getAudioEngineClient: vi.fn(() => ({
    initializeEngine: vi.fn().mockResolvedValue(undefined),
    startRealtimeProcessing: vi.fn().mockResolvedValue(undefined),
    stopRealtimeProcessing: vi.fn().mockResolvedValue(undefined),
    createProcessor: vi.fn().mockResolvedValue('processor_1'),
    loadAudioGraph: vi.fn().mockResolvedValue(undefined),
    getEngineStatus: vi.fn(() => ({
      isRunning: false,
      sampleRate: 44100,
      bufferSize: 512,
      processorCount: 0,
      graphNodeCount: 0,
      errorCount: 0,
    })),
    isConnected: vi.fn(() => true),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@/lib/audio-engine/AudioRouting', () => ({
  getAudioRoutingManager: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    addNode: vi.fn().mockResolvedValue(undefined),
    removeNode: vi.fn().mockResolvedValue(undefined),
    convertFlowToAudioGraph: vi.fn().mockResolvedValue(undefined),
    startProcessing: vi.fn().mockResolvedValue(undefined),
    stopProcessing: vi.fn().mockResolvedValue(undefined),
    getEngineStatus: vi.fn(() => ({
      isPlaying: false,
      isInitialized: true,
    })),
    dispose: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the audio store
vi.mock('@/stores/audioStore', () => ({
  useAudioStore: vi.fn(() => ({
    transport: {
      isPlaying: false,
      currentTime: 0,
      tempo: 120,
      timeSignature: [4, 4],
      loopEnabled: false,
    },
    play: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    updateMasterLevel: vi.fn(),
  })),
}));

describe('Audio Engine Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AudioEngineControls', () => {
    it('should render controls correctly', () => {
      render(<AudioEngineControls />);

      expect(screen.getByText('Audio Engine')).toBeInTheDocument();
      expect(screen.getByText('Play')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Sample Rate:')).toBeInTheDocument();
      expect(screen.getByText('44100 Hz')).toBeInTheDocument();
    });

    it('should handle play button click', async () => {
      const user = userEvent.setup();
      render(<AudioEngineControls />);

      const playButton = screen.getByText('Play');
      await user.click(playButton);

      const engineStore = useAudioEngineStore.getState();
      expect(engineStore.isProcessing).toBe(true);
    });

    it('should show initialization status', () => {
      render(<AudioEngineControls />);

      expect(screen.getByText('Not Initialized')).toBeInTheDocument();
      expect(screen.getByText('Click Play to initialize the audio engine')).toBeInTheDocument();
    });

    it('should display engine status correctly', () => {
      render(<AudioEngineControls />);

      expect(screen.getByText('Nodes:')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Routes:')).toBeInTheDocument();
    });

    it('should render compact version correctly', () => {
      render(<AudioEngineControls compact />);

      expect(screen.queryByText('Audio Engine')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  describe('AudioNodeInspector', () => {
    const mockNode = {
      id: 'test_node_1',
      name: 'Test Node',
      type: 'processor' as const,
      inputs: [{ id: 'input1', nodeId: 'test_node_1', name: 'Audio In', type: 'audio', connected: true }],
      outputs: [{ id: 'output1', nodeId: 'test_node_1', name: 'Audio Out', type: 'audio', connected: true }],
      parameters: { gain: 0.8, frequency: 440 },
      state: 'active' as const,
      position: { x: 100, y: 100 },
    };

    beforeEach(() => {
      vi.mocked(useAudioEngineStore).mockReturnValue({
        nodes: new Map([['test_node_1', mockNode]]),
        routes: new Map(),
        selectedNodeId: 'test_node_1',
        getNodeAnalysis: vi.fn(() => ({
          levels: { peak: -6, rms: -12, lufs: -23 },
          spectrum: new Float32Array(1024),
          waveform: new Uint8Array(1024),
        })),
        // Mock other methods as needed
        setNodeParameter: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
      } as any);
    });

    it('should render node inspector correctly', () => {
      render(<AudioNodeInspector nodeId="test_node_1" />);

      expect(screen.getByText('Test Node')).toBeInTheDocument();
      expect(screen.getByText('processor')).toBeInTheDocument();
      expect(screen.getByText('Levels')).toBeInTheDocument();
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Connections')).toBeInTheDocument();
    });

    it('should display level meters correctly', () => {
      render(<AudioNodeInspector nodeId="test_node_1" />);

      expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
      expect(screen.getByText('-12.0 dB')).toBeInTheDocument();
      expect(screen.getByText('-23.0 LUFS')).toBeInTheDocument();
    });

    it('should display parameters correctly', () => {
      render(<AudioNodeInspector nodeId="test_node_1" />);

      expect(screen.getByText('gain')).toBeInTheDocument();
      expect(screen.getByText('frequency')).toBeInTheDocument();
      expect(screen.getByText('0.800')).toBeInTheDocument();
      expect(screen.getByText('440.000')).toBeInTheDocument();
    });

    it('should handle node removal', async () => {
      const user = userEvent.setup();
      const mockRemoveNode = vi.fn();

      vi.mocked(useAudioEngineStore).mockReturnValue({
        nodes: new Map(),
        edges: new Map(),
        selectedNodeId: null,
        addNode: vi.fn(),
        removeNode: mockRemoveNode,
        updateNode: vi.fn(),
        selectNode: vi.fn(),
        clearSelection: vi.fn(),
      } as any);

      render(<AudioNodeInspector nodeId="test_node_1" />);

      const removeButton = screen.getByTitle('Remove Node');
      await user.click(removeButton);

      expect(mockRemoveNode).toHaveBeenCalledWith('test_node_1');
    });

    it('should show not found state for invalid node', () => {
      render(<AudioNodeInspector nodeId="invalid_node" />);

      expect(screen.getByText('Node not found')).toBeInTheDocument();
    });
  });

  describe('AudioVisualizer', () => {
    beforeEach(() => {
      vi.mocked(useAudioEngineStore).mockReturnValue({
        nodes: new Map(),
        routes: new Map(),
        getNodeAnalysis: vi.fn(() => ({
          levels: { peak: -6, rms: -12, lufs: -23 },
          spectrum: new Float32Array(1024),
          waveform: new Uint8Array(1024),
        })),
      } as any);
    });

    it('should render visualizer correctly', () => {
      render(<AudioVisualizer />);

      expect(screen.getByText('Audio Visualizer')).toBeInTheDocument();
      expect(screen.getByText('Spectrum')).toBeInTheDocument();
      expect(screen.getByText('Waveform')).toBeInTheDocument();
      expect(screen.getByText('Both')).toBeInTheDocument();
    });

    it('should display level information', () => {
      render(<AudioVisualizer />);

      expect(screen.getByText('Peak')).toBeInTheDocument();
      expect(screen.getByText('RMS')).toBeInTheDocument();
      expect(screen.getByText('LUFS')).toBeInTheDocument();
      expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
    });

    it('should handle visualization type changes', async () => {
      const user = userEvent.setup();
      render(<AudioVisualizer />);

      const spectrumButton = screen.getByRole('button', { name: /spectrum/i });
      await user.click(spectrumButton);

      // Button should be highlighted when selected
      expect(spectrumButton).toHaveClass('bg-white', 'text-blue-600', 'shadow-sm');
    });

    it('should handle data export', async () => {
      const user = userEvent.setup();
      const mockAnchor = vi.fn();
      global.URL.createObjectURL = vi.fn();
      global.URL.revokeObjectURL = vi.fn();

      // Mock the createElement and click methods
      const mockCreateElement = vi.fn(() => ({
        href: '',
        download: '',
        click: mockAnchor,
      }));
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true,
      });

      render(<AudioVisualizer />);

      const exportButton = screen.getByTitle('Export Analysis Data');
      await user.click(exportButton);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
    });
  });

  describe('Audio Engine Store Integration', () => {
    it('should initialize engine correctly', async () => {
      const store = useAudioEngineStore.getState();

      await store.initializeEngine();

      expect(store.isInitialized).toBe(true);
    });

    it('should start and stop processing correctly', async () => {
      const store = useAudioEngineStore.getState();

      await store.initializeEngine();
      await store.startProcessing();
      expect(store.isProcessing).toBe(true);

      await store.stopProcessing();
      expect(store.isProcessing).toBe(false);
    });

    it('should manage nodes correctly', async () => {
      const store = useAudioEngineStore.getState();
      const mockNode = {
        id: 'test_node',
        name: 'Test Node',
        type: 'processor' as const,
        inputs: [],
        outputs: [],
        parameters: {},
        state: 'active' as const,
        position: { x: 0, y: 0 },
      };

      await store.addNode(mockNode);
      expect(store.nodes.has('test_node')).toBe(true);

      await store.removeNode('test_node');
      expect(store.nodes.has('test_node')).toBe(false);
    });

    it('should handle parameter changes correctly', async () => {
      const store = useAudioEngineStore.getState();
      const mockNode = {
        id: 'test_node',
        name: 'Test Node',
        type: 'processor' as const,
        inputs: [],
        outputs: [],
        parameters: { gain: 0.5 },
        state: 'active' as const,
        position: { x: 0, y: 0 },
      };

      await store.addNode(mockNode);
      await store.setNodeParameter('test_node', 'gain', 0.8);

      const node = store.nodes.get('test_node');
      expect(node?.parameters.gain).toBe(0.8);
    });
  });

  describe('Integration with Flow Workspace', () => {
    it('should synchronize flow nodes with audio routing', async () => {
      const flowNodes = [
        {
          id: 'flow_node_1',
          type: 'track' as const,
          position: { x: 100, y: 100 },
          data: {
            type: 'track' as const,
            label: 'Track 1',
            order: 0,
            path: [],
            trackType: 'audio' as const,
            parameters: { volume: 0.8 }
          },
        },
      ];

      const flowEdges = [
        {
          id: 'flow_edge_1',
          source: 'flow_node_1',
          target: 'flow_node_2',
          data: { gain: 1.0 },
        },
      ];

      const routingManager = getAudioRoutingManager();

      await routingManager.convertFlowToAudioGraph(flowNodes, flowEdges);

      expect(routingManager.convertFlowToAudioGraph).toHaveBeenCalledWith(flowNodes, flowEdges);
    });

    it('should handle flow node selection', () => {
      const store = useAudioEngineStore.getState();

      store.selectNode('selected_node_id');
      expect(store.selectedNodeId).toBe('selected_node_id');

      store.selectNode(null);
      expect(store.selectedNodeId).toBe(null);
    });
  });
});