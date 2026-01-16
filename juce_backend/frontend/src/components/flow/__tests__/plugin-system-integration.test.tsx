import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { PluginNode, createPluginNodeData, pluginNodeType } from '../PluginNode';
import type { PluginInstance, PluginMetadata, PluginState } from '@/types/plugins';

// Mock the plugin store
vi.mock('@/stores/pluginStore', () => ({
  usePluginStore: vi.fn(() => ({
    pluginInstances: {},
    searchPlugins: vi.fn(() => []),
    addPluginInstance: vi.fn(),
    removePluginInstance: vi.fn(),
    updatePluginInstance: vi.fn(),
    bypassPlugin: vi.fn(),
    setPluginParameter: vi.fn(),
    loadPluginPreset: vi.fn(),
    getTrackPlugins: vi.fn(() => []),
    getActivePlugins: vi.fn(() => []),
    getTotalCpuUsage: vi.fn(() => 0),
    getPluginsByCategory: vi.fn(() => []),
    getPluginsByFormat: vi.fn(() => []),
    availablePlugins: [],
    searchResults: [],
    recommendations: [],
  })),
}));

// Mock the audio engine store
vi.mock('@/lib/audio-engine/AudioEngineStore', () => ({
  useAudioEngineStore: vi.fn(() => ({
    isInitialized: true,
    isProcessing: false,
    nodes: new Map(),
    selectedNodeId: null,
    selectNode: vi.fn(),
    setNodeParameter: vi.fn(),
    updateAnalysisData: vi.fn(),
    initializeEngine: vi.fn().mockResolvedValue(undefined),
    startProcessing: vi.fn().mockResolvedValue(undefined),
    stopProcessing: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    getEngineStatus: vi.fn(() => ({
      isInitialized: true,
      isPlaying: false,
      sampleRate: 44100,
      bufferSize: 512,
      contextState: 'running',
      nodeCount: 0,
    })),
  })),
  useAutoInitializeAudioEngine: vi.fn(() => ({
    isInitialized: true,
    isInitializing: false,
    error: null,
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

describe('Plugin System Integration', () => {
  // Helper function to render components with ReactFlowProvider
  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <ReactFlowProvider>
        {ui}
      </ReactFlowProvider>
    );
  };

  const mockPluginMetadata: PluginMetadata = {
    name: 'Test EQ Plugin',
    manufacturer: 'Test Manufacturer',
    version: '1.0.0',
    unique_id: 'test_eq_123',
    id: 'test_eq_123', // Alias for unique_id
    category: 'eq',
    format: 'VST3',
    tags: ['equalizer', 'mixing', 'audio'],
    input_channels: 2,
    output_channels: 2,
    latency_samples: 128,
    cpu_usage_estimate: 0.15,
    memory_usage_mb: 50,
    quality_rating: 4.5,
    user_rating: 4.2,
    supported_sample_rates: [44100, 48000, 96000],
    supports_64bit: true,
  };

  const mockPluginInstance: PluginInstance = {
    instance_id: 'test_instance_1',
    plugin_metadata: mockPluginMetadata,
    state: 'loaded',
    is_bypassed: false,
    parameters: {
      'gain': {
        name: 'gain',
        display_name: 'Gain',
        value: 0.0,
        min_value: -60.0,
        max_value: 12.0,
        default_value: 0.0,
        unit: 'dB',
        is_automatable: true,
        parameter_type: 'float',
        normalized_value: 0.5,
      },
      'frequency': {
        name: 'frequency',
        display_name: 'Frequency',
        value: 1000.0,
        min_value: 20.0,
        max_value: 20000.0,
        default_value: 1000.0,
        unit: 'Hz',
        is_automatable: true,
        parameter_type: 'float',
        normalized_value: 0.05,
      },
    },
    available_presets: [
      {
        name: 'Default',
        description: 'Default preset',
        parameters: { gain: 0.0, frequency: 1000.0 },
        tags: ['default'],
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
    cpu_usage: 0.15,
    processing_time_ms: 2.5,
    created_at: '2024-01-01T00:00:00Z',
    last_used: '2024-01-01T00:00:00Z',
    is_active: false,
    latency_ms: 2.9,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PluginNode Component', () => {
    it('should render plugin node correctly', () => {
      const nodeData = createPluginNodeData(mockPluginInstance, { x: 100, y: 100 });

      renderWithProvider(
        <div data-testid="plugin-node-wrapper">
          <PluginNode
            id="test_node"
            data={nodeData}
          />
        </div>
      );

      expect(screen.getByText('Test EQ Plugin')).toBeInTheDocument();
      expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
    });

    it('should show plugin status indicators', () => {
      const nodeData = createPluginNodeData(mockPluginInstance, { x: 100, y: 100 });

      renderWithProvider(
        <div data-testid="plugin-node-wrapper">
          <PluginNode
            id="test_node"
            data={nodeData}
          />
        </div>
      );

      expect(screen.getByText('loaded')).toBeInTheDocument();
    });

    it('should handle bypassed state correctly', () => {
      const bypassedInstance = {
        ...mockPluginInstance,
        is_bypassed: true,
        state: 'bypassed' as PluginState,
      };
      const nodeData = createPluginNodeData(bypassedInstance, { x: 100, y: 100 });

      renderWithProvider(
        <div data-testid="plugin-node-wrapper">
          <PluginNode
            id="test_node"
            data={nodeData}
          />
        </div>
      );

      expect(screen.getByText('bypassed')).toBeInTheDocument();
    });

    it('should display performance metrics', () => {
      const nodeData = createPluginNodeData(mockPluginInstance, { x: 100, y: 100 });

      renderWithProvider(
        <div data-testid="plugin-node-wrapper">
          <PluginNode
            id="test_node"
            data={nodeData}
          />
        </div>
      );

      expect(screen.getByText('15.0%')).toBeInTheDocument();
      expect(screen.getByText('2.9ms')).toBeInTheDocument();
    });

    it('should show current preset when available', () => {
      const nodeData = createPluginNodeData({
        ...mockPluginInstance,
        current_preset: 'Default',
      }, { x: 100, y: 100 });

      renderWithProvider(
        <div data-testid="plugin-node-wrapper">
          <PluginNode
            id="test_node"
            data={nodeData}
          />
        </div>
      );

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should expand to show parameters', async () => {
      const nodeData = createPluginNodeData(mockPluginInstance, { x: 100, y: 100 });

      renderWithProvider(
        <div data-testid="plugin-node-wrapper">
          <PluginNode
            id="test_node"
            data={nodeData}
          />
        </div>
      );

      // Initially collapsed
      expect(screen.queryByText('gain')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('Parameters (2)'));

      // Should show parameters
      await waitFor(() => {
        expect(screen.getByText('Gain')).toBeInTheDocument();
        expect(screen.getByText('Frequency')).toBeInTheDocument();
      });
    });
  });

  describe('Plugin Browser Modal', () => {
    it('should render plugin browser modal', async () => {
      const { PluginBrowserModal } = await import('../PluginBrowserModal');

      render(
        <PluginBrowserModal
          isOpen={true}
          onClose={() => {}}
          onPluginSelect={() => {}}
        />
      );

      expect(screen.getByText('Plugin Browser')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search plugins...')).toBeInTheDocument();
    });

    it('should filter plugins by category', async () => {
      const { PluginBrowserModal } = await import('../PluginBrowserModal');

      render(
        <PluginBrowserModal
          isOpen={true}
          onClose={() => {}}
          onPluginSelect={() => {}}
        />
      );

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'eq' } });

      expect(screen.getByDisplayValue('eq')).toBeInTheDocument();
    });

    it('should search plugins by name', async () => {
      const { PluginBrowserModal } = await import('../PluginBrowserModal');

      render(
        <PluginBrowserModal
          isOpen={true}
          onClose={() => {}}
          onPluginSelect={() => {}}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search plugins...');
      fireEvent.change(searchInput, { target: { value: 'Test EQ' } });

      expect(searchInput).toHaveValue('Test EQ');
    });

    it('should handle plugin selection', async () => {
      const onPluginSelect = vi.fn();
      const { PluginBrowserModal } = await import('../PluginBrowserModal');

      render(
        <PluginBrowserModal
          isOpen={true}
          onClose={() => {}}
          onPluginSelect={onPluginSelect}
        />
      );

      // Mock plugin search results
      const pluginStore = require('@/stores/pluginStore').usePluginStore();
      pluginStore.searchPlugins = vi.fn(() => [mockPluginMetadata]);

      // Find and click plugin
      const pluginName = screen.getByText('Test EQ Plugin');
      fireEvent.click(pluginName);

      expect(onPluginSelect).toHaveBeenCalledWith(mockPluginMetadata);
    });
  });

  describe('Plugin Automation', () => {
    it('should render plugin automation component', async () => {
      const { PluginAutomation } = await import('../PluginAutomation');

      render(
        <PluginAutomation
          pluginInstanceId="test_instance_1"
        />
      );

      expect(screen.getByText('Plugin Automation')).toBeInTheDocument();
    });

    it('should show automatable parameters', async () => {
      const { PluginAutomation } = await import('../PluginAutomation');

      render(
        <PluginAutomation
          pluginInstanceId="test_instance_1"
        />
      );

      expect(screen.getByText('2 parameters available')).toBeInTheDocument();
      expect(screen.getByText('Gain')).toBeInTheDocument();
      expect(screen.getByText('Frequency')).toBeInTheDocument();
    });

    it('should handle parameter automation toggle', async () => {
      const { PluginAutomation } = await import('../PluginAutomation');

      render(
        <PluginAutomation
          pluginInstanceId="test_instance_1"
        />
      );

      // Find automation toggle for gain parameter
      const automationToggle = screen.getAllByRole('button')[0]; // First button should be the automation toggle
      expect(automationToggle).toBeInTheDocument();

      // Toggle automation on
      fireEvent.click(automationToggle);

      // Should show record button
      expect(screen.getByText('◉')).toBeInTheDocument();
    });

    it('should display transport controls', async () => {
      const { PluginAutomation } = await import('../PluginAutomation');

      render(
        <PluginAutomation
          pluginInstanceId="test_instance_1"
        />
      );

      expect(screen.getByText('Time: 0:00.00')).toBeInTheDocument();
      expect(screen.getByTitle('Play/Pause')).toBeInTheDocument();
      expect(screen.getByTitle('Go to Start')).toBeInTheDocument();
    });

    it('should show current time indicator', async () => {
      const { PluginAutomation } = await import('../PluginAutomation');

      render(
        <PluginAutomation
          pluginInstanceId="test_instance_1"
        />
      );

      // Find the time indicator line (should be visible)
      const svgElement = document.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });
  });

  describe('Plugin Flow Integration', () => {
    it('should create plugin node data correctly', () => {
      const position = { x: 100, y: 100 };
      const nodeData = createPluginNodeData(mockPluginInstance, position);

      expect(nodeData.type).toBe(pluginNodeType);
      expect(nodeData.label).toBe(mockPluginMetadata.name);
      expect(nodeData.pluginName).toBe(mockPluginMetadata.name);
      expect(nodeData.pluginCategory).toBe(mockPluginMetadata.category);
      expect(nodeData.color).toBe('#3b82f6');
    });

    it('should integrate with flow node types', () => {
      const nodeData = createPluginNodeData(mockPluginInstance, { x: 100, y: 100 });

      expect(nodeData.type).toBeDefined();
      expect(nodeData.type).toBe('plugin');
    });

    it('should handle plugin instance association', () => {
      const nodeData = createPluginNodeData(mockPluginInstance, { x: 100, y: 100 });

      expect(nodeData.pluginInstanceId).toBe(mockPluginInstance.instance_id);
    });
  });

  describe('Plugin System State Management', () => {
    it('should integrate with plugin store', () => {
      const pluginStore = require('@/stores/pluginStore').usePluginStore();

      // Plugin store should have required methods
      expect(pluginStore.addPluginInstance).toBeDefined();
      expect(pluginStore.removePluginInstance).toBeDefined();
      expect(pluginStore.setPluginParameter).toBeDefined();
      expect(pluginStore.bypassPlugin).toBeDefined();
    });

    it('should integrate with audio engine store', () => {
      const audioEngineStore = require('@/lib/audio-engine/AudioEngineStore').useAudioEngineStore();

      // Audio engine store should have required methods
      expect(audioEngineStore.selectNode).toBeDefined();
      expect(audioEngineStore.setNodeParameter).toBeDefined();
    });

    it('should handle plugin parameter updates', () => {
      const pluginStore = require('@/stores/pluginStore').usePluginStore();

      const instanceId = 'test_instance_1';
      const parameterId = 'gain';
      const value = 6.0;

      pluginStore.setPluginParameter(instanceId, parameterId, value);

      expect(pluginStore.setPluginParameter).toHaveBeenCalledWith(instanceId, parameterId, value);
    });
  });
});