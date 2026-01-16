import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PluginInterface from '../PluginInterface';
import type { PluginInstance } from '@/types/plugins';

// Mock dependencies
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
  }),
}));

vi.mock('@/stores/pluginStore', () => ({
  usePluginStore: () => ({
    updatePluginInstance: vi.fn(),
  }),
}));

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
  available_presets: [],
  cpu_usage: 0.05,
  processing_time_ms: 2.5,
  created_at: '2024-01-01T00:00:00Z',
  last_used: '2024-01-01T00:00:00Z',
  is_active: true,
  latency_ms: 5.0,
};

describe('PluginInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render plugin interface with mode controls', () => {
    render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    expect(screen.getAllByText('Plugin Interface')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Native')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Generic')[0]).toBeInTheDocument();
  });

  it('should switch between native and generic modes', () => {
    render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    const genericButton = screen.getAllByText('Generic')[0];
    fireEvent.click(genericButton);

    // Should show generic controls
    expect(screen.getByPlaceholderText('Search parameters...')).toBeInTheDocument();
  });

  it('should render generic parameter controls', () => {
    render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    // Switch to generic mode
    const genericButton = screen.getAllByText('Generic')[0];
    fireEvent.click(genericButton);

    // Should show parameter controls
    expect(screen.getAllByText('Gain')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Frequency')[0]).toBeInTheDocument();
  });

  it('should filter parameters by search term', () => {
    render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    // Switch to generic mode
    const genericButton = screen.getAllByText('Generic')[0];
    fireEvent.click(genericButton);

    // Search for specific parameter
    const searchInput = screen.getByPlaceholderText('Search parameters...');
    fireEvent.change(searchInput, { target: { value: 'gain' } });

    // Should show only gain parameter
    expect(screen.getAllByText('Gain')[0]).toBeInTheDocument();
    expect(screen.queryAllByText('Frequency')).toHaveLength(0);
  });

  it('should handle parameter value changes', () => {
    const { container } = render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    // Switch to generic mode
    const genericButton = screen.getAllByText('Generic')[0];
    fireEvent.click(genericButton);

    // Find and interact with parameter slider
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);

    // Change slider value
    fireEvent.change(sliders[0], { target: { value: '0.8' } });

    // Should update the displayed value
    expect(container.textContent).toContain('0.80');
  });

  it('should show WAM interface for WAM plugins', () => {
    const wamPlugin = {
      ...mockPluginInstance,
      plugin_metadata: {
        ...mockPluginInstance.plugin_metadata,
        format: 'WAM' as const,
      },
    };

    render(
      <PluginInterface
        pluginInstance={wamPlugin}
        trackId="track-1"
      />
    );

    // Should show iframe for WAM plugin
    const iframe = screen.getByTitle('Test Plugin Interface');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe('IFRAME');
  });

  it('should handle UI loading states', () => {
    render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
      />
    );

    // Should show loading indicator initially
    expect(screen.getAllByText('Loading native interface...')[0]).toBeInTheDocument();
  });

  it('should show error state when UI fails to load', () => {
    render(
      <PluginInterface
        pluginInstance={mockPluginInstance}
        trackId="track-1"
        showNativeUI={false}
      />
    );

    // Should fall back to generic mode when native UI is disabled
    expect(screen.getByPlaceholderText('Search parameters...')).toBeInTheDocument();
  });
});