import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginPresetBrowser from '../PluginPresetBrowser';
import type { PluginInstance, PluginPreset } from '@/types/plugins';

// Mock dependencies
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
  }),
}));

vi.mock('@/stores/pluginStore', () => ({
  usePluginStore: () => ({
    loadPluginPreset: vi.fn(),
    updatePluginInstance: vi.fn(),
  }),
}));

const mockPresets: PluginPreset[] = [
  {
    name: 'Warm Lead',
    description: 'A warm lead sound',
    parameters: { gain: 0.8, frequency: 2000 },
    tags: ['lead', 'warm'],
    author: 'Test Author',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    name: 'Bass Boost',
    description: 'Enhanced bass response',
    parameters: { gain: 0.6, frequency: 80 },
    tags: ['bass', 'boost'],
    author: 'Test Author',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    name: 'Vocal Clarity',
    description: 'Clear vocal processing',
    parameters: { gain: 0.7, frequency: 3000 },
    tags: ['vocal', 'clarity'],
    author: 'Another Author',
    created_at: '2024-01-03T00:00:00Z',
  },
];

const mockPluginInstance: PluginInstance = {
  instance_id: 'test-plugin-1',
  plugin_metadata: {
    name: 'Test Plugin',
    manufacturer: 'Test Manufacturer',
    version: '1.0.0',
    unique_id: 'test-plugin-unique-id',
    id: 'test-plugin-unique-id',
    category: 'eq',
    format: 'VST3',
    tags: ['test'],
    input_channels: 2,
    output_channels: 2,
    latency_samples: 0,
    cpu_usage_estimate: 0.1,
    memory_usage_mb: 50,
    quality_rating: 4.5,
    user_rating: 4.0,
    supported_sample_rates: [44100, 48000],
    supports_64bit: true,
  },
  state: 'active',
  is_bypassed: false,
  parameters: {
    gain: {
      name: 'gain',
      display_name: 'Gain',
      value: 0.5,
      min_value: 0,
      max_value: 1,
      default_value: 0.5,
      unit: 'dB',
      is_automatable: true,
      parameter_type: 'float',
      normalized_value: 0.5,
    },
    frequency: {
      name: 'frequency',
      display_name: 'Frequency',
      value: 1000,
      min_value: 20,
      max_value: 20000,
      default_value: 1000,
      unit: 'Hz',
      is_automatable: true,
      parameter_type: 'float',
      normalized_value: 0.5,
    },
  },
  current_preset: undefined,
  available_presets: mockPresets,
  cpu_usage: 0.05,
  processing_time_ms: 2.5,
  created_at: '2024-01-01T00:00:00Z',
  last_used: '2024-01-01T00:00:00Z',
  is_active: true,
  latency_ms: 5.0,
};

describe('PluginPresetBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render preset browser with presets list', () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    expect(screen.getAllByText('Preset Browser')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Warm Lead')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Bass Boost')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Vocal Clarity')[0]).toBeInTheDocument();
  });

  it('should filter presets by search term', () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search presets...');
    fireEvent.change(searchInput, { target: { value: 'bass' } });

    expect(screen.getAllByText('Bass Boost')[0]).toBeInTheDocument();
    expect(screen.queryAllByText('Warm Lead')).toHaveLength(0);
    expect(screen.queryAllByText('Vocal Clarity')).toHaveLength(0);
  });

  it('should filter presets by tag', () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    const leadTag = screen.getAllByText('lead')[0];
    fireEvent.click(leadTag);

    expect(screen.getAllByText('Warm Lead')[0]).toBeInTheDocument();
    expect(screen.queryAllByText('Bass Boost')).toHaveLength(0);
    expect(screen.queryAllByText('Vocal Clarity')).toHaveLength(0);
  });

  it('should sort presets by different criteria', () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    const sortSelect = screen.getByDisplayValue('Sort by Name');
    fireEvent.change(sortSelect, { target: { value: 'author' } });

    // Should still show all presets but potentially in different order
    expect(screen.getAllByText('Warm Lead')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Bass Boost')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Vocal Clarity')[0]).toBeInTheDocument();
  });

  it('should select preset and show details', () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    const warmLeadPreset = screen.getAllByText('Warm Lead')[0];
    fireEvent.click(warmLeadPreset);

    // Should show preset details
    expect(screen.getAllByText('A warm lead sound')[0]).toBeInTheDocument();
    expect(screen.getAllByText('by Test Author')[0]).toBeInTheDocument();
  });

  it('should handle preset loading', () => {
    const mockOnPresetLoad = vi.fn();
    
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
        onPresetLoad={mockOnPresetLoad}
      />
    );

    // Select a preset first
    const warmLeadPreset = screen.getAllByText('Warm Lead')[0];
    fireEvent.click(warmLeadPreset);

    // Click load button
    const loadButton = screen.getAllByText('Load')[0];
    fireEvent.click(loadButton);

    expect(mockOnPresetLoad).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Warm Lead'
    }));
  });

  it('should handle preset preview', async () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
        showPreview={true}
      />
    );

    // Select a preset first
    const warmLeadPreset = screen.getAllByText('Warm Lead')[0];
    fireEvent.click(warmLeadPreset);

    // Click preview button
    const previewButton = screen.getAllByText('Preview')[0];
    fireEvent.click(previewButton);

    // Should show preview mode indicator
    await waitFor(() => {
      expect(screen.getAllByText('Preview Mode')[0]).toBeInTheDocument();
    });
  });

  it('should show no presets message when filtered results are empty', () => {
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search presets...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getAllByText('No presets found')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Try adjusting your search or tag filter')[0]).toBeInTheDocument();
  });

  it('should handle double-click to load preset', () => {
    const mockOnPresetLoad = vi.fn();
    
    render(
      <PluginPresetBrowser
        pluginInstance={mockPluginInstance}
        trackId="track-1"
        onPresetLoad={mockOnPresetLoad}
      />
    );

    const warmLeadPreset = screen.getAllByText('Warm Lead')[0];
    fireEvent.doubleClick(warmLeadPreset);

    expect(mockOnPresetLoad).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Warm Lead'
    }));
  });

  it('should show current preset indicator', () => {
    const pluginWithCurrentPreset = {
      ...mockPluginInstance,
      current_preset: 'Warm Lead',
    };

    render(
      <PluginPresetBrowser
        pluginInstance={pluginWithCurrentPreset}
        trackId="track-1"
      />
    );

    // Should show indicator for current preset
    const presetItems = screen.getAllByText('●');
    expect(presetItems.length).toBeGreaterThan(0);
  });
});