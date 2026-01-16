/**
 * Smoke test for plugin system integration
 * Verifies basic plugin functionality works without complex setup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPluginNodeData, pluginNodeType } from '../PluginNode';
import type { PluginCategory, PluginFormat } from '@/types/plugins';

describe('Plugin System Integration Smoke Test', () => {
  it('should create plugin node data with correct structure', () => {
    const mockPluginInstance = {
      instance_id: 'test_plugin_1',
      plugin_metadata: {
        name: 'Test EQ Plugin',
        manufacturer: 'Test Manufacturer',
        category: 'eq' as PluginCategory,
        version: '1.0.0',
        unique_id: 'test_eq_123',
        id: 'test_eq_123',
        format: 'VST3' as PluginFormat,
        tags: ['equalizer', 'mixing'],
        input_channels: 2,
        output_channels: 2,
        latency_samples: 128,
        cpu_usage_estimate: 0.15,
        memory_usage_mb: 50,
        quality_rating: 4.5,
        user_rating: 4.2,
        supported_sample_rates: [44100, 48000],
        supports_64bit: true,
      },
      state: 'loaded' as const,
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
      },
      available_presets: [],
      cpu_usage: 0.15,
      processing_time_ms: 2.5,
      created_at: '2024-01-01T00:00:00Z',
      last_used: '2024-01-01T00:00:00Z',
      is_active: false,
      latency_ms: 2.9,
    };

    const position = { x: 100, y: 100 };
    const nodeData = createPluginNodeData(mockPluginInstance, position);

    // Verify basic structure
    expect(nodeData.type).toBe(pluginNodeType);
    expect(nodeData.label).toBe('Test EQ Plugin');
    expect(nodeData.pluginInstanceId).toBe('test_plugin_1');
    expect(nodeData.pluginName).toBe('Test EQ Plugin');
    expect(nodeData.pluginCategory).toBe('eq');
    expect(nodeData.color).toBe('#3b82f6');
    expect(nodeData.position).toEqual(position);
  });

  it('should have correct plugin node type', () => {
    expect(pluginNodeType).toBe('plugin');
  });

  it('should handle plugin with bypass state', () => {
    const bypassedPlugin = {
      instance_id: 'test_plugin_2',
      plugin_metadata: {
        name: 'Test Compressor',
        manufacturer: 'Test Company',
        category: 'compressor' as PluginCategory,
        version: '1.0.0',
        unique_id: 'test_comp_456',
        id: 'test_comp_456',
        format: 'VST3' as PluginFormat,
        tags: ['dynamics', 'compression'],
        input_channels: 2,
        output_channels: 2,
        latency_samples: 64,
        cpu_usage_estimate: 0.08,
        memory_usage_mb: 30,
        quality_rating: 4.0,
        user_rating: 4.5,
        supported_sample_rates: [44100, 48000],
        supports_64bit: true,
      },
      state: 'bypassed' as const,
      is_bypassed: true,
      parameters: {},
      available_presets: [],
      cpu_usage: 0.08,
      processing_time_ms: 1.2,
      created_at: '2024-01-01T00:00:00Z',
      last_used: '2024-01-01T00:00:00Z',
      is_active: false,
      latency_ms: 1.5,
    };

    const nodeData = createPluginNodeData(bypassedPlugin, { x: 0, y: 0 });

    expect(nodeData.isBypassed).toBe(true);
    expect(nodeData.label).toBe('Test Compressor');
    expect(nodeData.pluginCategory).toBe('compressor');
  });

  it('should handle different plugin categories', () => {
    const categories = ['reverb', 'delay', 'distortion', 'synthesizer', 'analyzer'];

    categories.forEach(category => {
      const plugin = {
        instance_id: `test_${category}_1`,
        plugin_metadata: {
          name: `Test ${category.charAt(0).toUpperCase() + category.slice(1)}`,
          manufacturer: 'Test Maker',
          category: category as PluginCategory,
          version: '1.0.0',
          unique_id: `test_${category}_789`,
          id: `test_${category}_789`,
          format: 'VST3' as PluginFormat,
          tags: [category],
          input_channels: 2,
          output_channels: 2,
          latency_samples: 256,
          cpu_usage_estimate: 0.2,
          memory_usage_mb: 60,
          quality_rating: 4.0,
          user_rating: 4.0,
          supported_sample_rates: [44100, 48000],
          supports_64bit: true,
        },
        state: 'loaded' as const,
        is_bypassed: false,
        parameters: {},
        available_presets: [],
        cpu_usage: 0.2,
        processing_time_ms: 3.0,
        created_at: '2024-01-01T00:00:00Z',
        last_used: '2024-01-01T00:00:00Z',
        is_active: false,
        latency_ms: 5.8,
      };

      const nodeData = createPluginNodeData(plugin, { x: 0, y: 0 });

      expect(nodeData.pluginCategory).toBe(category);
      expect(nodeData.type).toBe(pluginNodeType);
      expect(nodeData.pluginInstanceId).toBe(`test_${category}_1`);
    });
  });
});