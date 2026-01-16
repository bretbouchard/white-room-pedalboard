import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginChainManager from '../PluginChainManager';
import type { PluginChain, PluginInstance } from '@/types/plugins';

// Mock dependencies
const mockCreatePluginChain = vi.fn().mockReturnValue('new-chain-id');
const mockUpdatePluginChain = vi.fn();
const mockDeletePluginChain = vi.fn();

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
  }),
}));

vi.mock('@/stores/pluginStore', () => ({
  usePluginStore: () => ({
    pluginChains: {},
    trackPlugins: {
      'track-1': ['plugin-1', 'plugin-2'],
    },
    pluginInstances: {
      'plugin-1': {
        instance_id: 'plugin-1',
        plugin_metadata: {
          name: 'Test EQ',
          manufacturer: 'Test Manufacturer',
          version: '1.0.0',
          unique_id: 'test-eq-unique-id',
          category: 'eq',
          format: 'VST3',
          tags: ['eq'],
          input_channels: 2,
          output_channels: 2,
          latency_samples: 0,
          cpu_usage_estimate: 0.1,
          memory_usage_mb: 50,
          quality_rating: 4.5,
          user_rating: 4.3,
          supported_sample_rates: [44100, 48000],
          supported_buffer_sizes: [64, 128, 256, 512],
          has_editor: true,
          is_instrument: false,
          is_effect: true,
          is_synth: false,
          is_generator: false,
          is_analyzer: false,
          supports_midi: false,
          supports_sidechain: false,
          supports_automation: true,
          supports_presets: true,
          supports_state_save: true,
          file_path: '/path/to/plugin.vst3',
          install_date: '2024-01-01T00:00:00Z',
          last_scan_date: '2024-01-01T00:00:00Z',
          is_enabled: true,
          scan_error: null,
        },
        state: 'active',
        is_bypassed: false,
        parameters: {},
        current_preset: undefined,
        available_presets: [],
        cpu_usage: 0.05,
        processing_time_ms: 2.5,
        created_at: '2024-01-01T00:00:00Z',
        last_used: '2024-01-01T00:00:00Z',
        is_active: true,
        latency_ms: 5.0,
      },
      'plugin-2': {
        instance_id: 'plugin-2',
        plugin_metadata: {
          name: 'Test Compressor',
          manufacturer: 'Test Manufacturer',
          version: '1.0.0',
          unique_id: 'test-comp-unique-id',
          category: 'compressor',
          format: 'VST3',
          tags: ['compressor'],
          input_channels: 2,
          output_channels: 2,
          latency_samples: 0,
          cpu_usage_estimate: 0.15,
          memory_usage_mb: 60,
          quality_rating: 4.2,
          user_rating: 4.1,
          supported_sample_rates: [44100, 48000],
          supported_buffer_sizes: [64, 128, 256, 512],
          has_editor: true,
          is_instrument: false,
          is_effect: true,
          is_synth: false,
          is_generator: false,
          is_analyzer: false,
          supports_midi: false,
          supports_sidechain: false,
          supports_automation: true,
          supports_presets: true,
          supports_state_save: true,
          file_path: '/path/to/compressor.vst3',
          install_date: '2024-01-01T00:00:00Z',
          last_scan_date: '2024-01-01T00:00:00Z',
          is_enabled: true,
          scan_error: null,
        },
        state: 'active',
        is_bypassed: false,
        parameters: {},
        current_preset: undefined,
        available_presets: [],
        cpu_usage: 0.05,
        processing_time_ms: 2.5,
        created_at: '2024-01-01T00:00:00Z',
        last_used: '2024-01-01T00:00:00Z',
        is_active: true,
        latency_ms: 5.0,
      },
    },
    getTrackPlugins: (trackId: string) => {
      const pluginIds = trackId === 'track-1' ? ['plugin-1', 'plugin-2'] : [];
      const pluginInstances = {
        'plugin-1': {
          instance_id: 'plugin-1',
          plugin_metadata: {
            name: 'Test EQ',
            manufacturer: 'Test Manufacturer',
            version: '1.0.0',
            unique_id: 'test-eq-unique-id',
            category: 'eq',
            format: 'VST3',
            tags: ['eq'],
            input_channels: 2,
            output_channels: 2,
            latency_samples: 0,
            cpu_usage_estimate: 0.1,
            memory_usage_mb: 50,
            quality_rating: 4.5,
            user_rating: 4.3,
            supported_sample_rates: [44100, 48000],
            supported_buffer_sizes: [64, 128, 256, 512],
            has_editor: true,
            is_instrument: false,
            is_effect: true,
            is_synth: false,
            is_generator: false,
            is_analyzer: false,
            supports_midi: false,
            supports_sidechain: false,
            supports_automation: true,
            supports_presets: true,
            supports_state_save: true,
            file_path: '/path/to/eq.vst3',
            install_date: '2024-01-01T00:00:00Z',
            last_scan_date: '2024-01-01T00:00:00Z',
            is_enabled: true,
            scan_error: null,
          },
          state: 'active',
          is_bypassed: false,
          parameters: {},
          current_preset: undefined,
          available_presets: [],
          cpu_usage: 0.03,
          processing_time_ms: 1.5,
          created_at: '2024-01-01T00:00:00Z',
          last_used: '2024-01-01T00:00:00Z',
          is_active: true,
          latency_ms: 5.0,
        },
        'plugin-2': {
          instance_id: 'plugin-2',
          plugin_metadata: {
            name: 'Test Compressor',
            manufacturer: 'Test Manufacturer',
            version: '1.0.0',
            unique_id: 'test-comp-unique-id',
            category: 'compressor',
            format: 'VST3',
            tags: ['compressor'],
            input_channels: 2,
            output_channels: 2,
            latency_samples: 0,
            cpu_usage_estimate: 0.15,
            memory_usage_mb: 60,
            quality_rating: 4.2,
            user_rating: 4.1,
            supported_sample_rates: [44100, 48000],
            supported_buffer_sizes: [64, 128, 256, 512],
            has_editor: true,
            is_instrument: false,
            is_effect: true,
            is_synth: false,
            is_generator: false,
            is_analyzer: false,
            supports_midi: false,
            supports_sidechain: false,
            supports_automation: true,
            supports_presets: true,
            supports_state_save: true,
            file_path: '/path/to/compressor.vst3',
            install_date: '2024-01-01T00:00:00Z',
            last_scan_date: '2024-01-01T00:00:00Z',
            is_enabled: true,
            scan_error: null,
          },
          state: 'active',
          is_bypassed: false,
          parameters: {},
          current_preset: undefined,
          available_presets: [],
          cpu_usage: 0.05,
          processing_time_ms: 2.5,
          created_at: '2024-01-01T00:00:00Z',
          last_used: '2024-01-01T00:00:00Z',
          is_active: true,
          latency_ms: 5.0,
        },
      };
      return pluginIds.map(id => pluginInstances[id]).filter(Boolean);
    },
    createPluginChain: mockCreatePluginChain,
    updatePluginChain: mockUpdatePluginChain,
    deletePluginChain: mockDeletePluginChain,
  }),
}));




describe('PluginChainManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePluginChain.mockClear();
    mockUpdatePluginChain.mockClear();
    mockDeletePluginChain.mockClear();
  });

  it('should render plugin chain manager with header', () => {
    render(<PluginChainManager trackId="track-1" />);

    expect(screen.getAllByText('Plugin Chains')[0]).toBeInTheDocument();
    expect(screen.getAllByText('+ New Chain')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Templates')[0]).toBeInTheDocument();
  });

  it('should show create first chain when no chains exist', () => {
    render(<PluginChainManager trackId="track-1" />);

    expect(screen.getAllByText('No plugin chains created')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Create First Chain')[0]).toBeInTheDocument();
  });

  it('should handle creating new chain', () => {
    render(<PluginChainManager trackId="track-1" />);

    const newChainButton = screen.getAllByText('+ New Chain')[0];
    fireEvent.click(newChainButton);

    expect(mockCreatePluginChain).toHaveBeenCalledWith('track-1', 'New Chain', []);
  });

  it('should show template modal when templates button is clicked', () => {
    render(<PluginChainManager trackId="track-1" showTemplates={true} />);

    const templatesButton = screen.getAllByText('Templates')[0];
    fireEvent.click(templatesButton);

    expect(screen.getAllByText('Chain Templates')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Vocal Processing Chain')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Mastering Chain')[0]).toBeInTheDocument();
  });

  it('should filter templates by search term', () => {
    render(<PluginChainManager trackId="track-1" showTemplates={true} />);

    // Open template modal
    const templatesButton = screen.getAllByText('Templates')[0];
    fireEvent.click(templatesButton);

    // Search for vocal templates
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'vocal' } });

    expect(screen.getAllByText('Vocal Processing Chain')[0]).toBeInTheDocument();
    expect(screen.queryAllByText('Mastering Chain')).toHaveLength(0);
  });

  it('should show unassigned plugins section', () => {
    render(<PluginChainManager trackId="track-1" />);

    expect(screen.getAllByText('Unassigned Plugins')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Test EQ')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Test Compressor')[0]).toBeInTheDocument();
  });

  it('should handle routing mode change when parallel routing is enabled', () => {
    render(<PluginChainManager trackId="track-1" allowParallelRouting={true} />);

    expect(screen.getAllByText('Routing:')[0]).toBeInTheDocument();
    
    const routingSelect = screen.getByDisplayValue('Serial');
    fireEvent.change(routingSelect, { target: { value: 'parallel' } });

    expect(routingSelect).toHaveValue('parallel');
  });

  it('should close template modal when close button is clicked', () => {
    render(<PluginChainManager trackId="track-1" showTemplates={true} />);

    // Open template modal
    const templatesButton = screen.getAllByText('Templates')[0];
    fireEvent.click(templatesButton);

    expect(screen.getAllByText('Chain Templates')[0]).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getAllByText('×')[0];
    fireEvent.click(closeButton);

    expect(screen.queryAllByText('Chain Templates')).toHaveLength(0);
  });

  it('should handle template selection', async () => {
    render(<PluginChainManager trackId="track-1" showTemplates={true} />);

    // Open template modal
    const templatesButton = screen.getAllByText('Templates')[0];
    fireEvent.click(templatesButton);

    // Click on vocal template
    const vocalTemplate = screen.getAllByText('Vocal Processing Chain')[0];
    fireEvent.click(vocalTemplate);

    expect(mockCreatePluginChain).toHaveBeenCalled();
  });

  it('should show no templates message when search yields no results', () => {
    render(<PluginChainManager trackId="track-1" showTemplates={true} />);

    // Open template modal
    const templatesButton = screen.getAllByText('Templates')[0];
    fireEvent.click(templatesButton);

    // Search for non-existent template
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getAllByText('No templates found')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Try adjusting your search')[0]).toBeInTheDocument();
  });
});