import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePluginStore } from '@/stores/pluginStore';
import Button from '@/components/ui/Button';
import Knob from '@/components/ui/Knob';
import Slider from '@/components/ui/Slider';
import PluginInterface from './PluginInterface';
import PluginPresetBrowser from './PluginPresetBrowser';
import PluginPerformanceMonitor from './PluginPerformanceMonitor';
import PluginStateManager from './PluginStateManager';
import type { PluginInstance, PluginParameter } from '@/types/plugins';

export interface PluginControlProps {
  pluginInstance: PluginInstance;
  trackId: string;
  className?: string;
  compact?: boolean;
  showPerformanceMetrics?: boolean;
  showNativeUI?: boolean;
  showPresetBrowser?: boolean;
  showStateManager?: boolean;
}

const PluginControl: React.FC<PluginControlProps> = ({
  pluginInstance,
  trackId,
  className,
  compact = false,
  showPerformanceMetrics = false,
  showNativeUI = true,
  showPresetBrowser = true,
  showStateManager = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(pluginInstance.current_preset || '');
  const [showParameters, setShowParameters] = useState(!compact);
  const [parameterSearch, setParameterSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'interface' | 'presets' | 'state' | 'performance'>('interface');

  const { sendMessage } = useWebSocket();
  const {
    bypassPlugin,
    setPluginParameter,
    loadPluginPreset,
    getPluginPerformance,
  } = usePluginStore();

  const performanceMetrics = getPluginPerformance(pluginInstance.instance_id);

  const handleBypass = useCallback(() => {
    const newBypassState = !pluginInstance.is_bypassed;
    bypassPlugin(pluginInstance.instance_id, newBypassState);

    // Send to backend
    sendMessage({
      type: 'plugin.bypass',
      data: {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        bypassed: newBypassState,
      },
    });
  }, [pluginInstance.instance_id, pluginInstance.is_bypassed, trackId, bypassPlugin, sendMessage]);

  const handleParameterChange = useCallback((parameterId: string, value: number) => {
    setPluginParameter(pluginInstance.instance_id, parameterId, value);

    // Send to backend
    sendMessage({
      type: 'plugin.parameter',
      data: {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        parameter_id: parameterId,
        parameter_value: value,
      },
    });
  }, [pluginInstance.instance_id, trackId, setPluginParameter, sendMessage]);

  const handlePresetChange = useCallback((presetName: string) => {
    if (!presetName) return;

    setSelectedPreset(presetName);
    loadPluginPreset(pluginInstance.instance_id, presetName);

    // Send to backend
    sendMessage({
      type: 'plugin.preset',
      data: {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        preset_name: presetName,
      },
    });
  }, [pluginInstance.instance_id, trackId, loadPluginPreset, sendMessage]);

  const handleRemove = useCallback(() => {
    // Send remove message to backend
    sendMessage({
      type: 'plugin.remove',
      data: {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
      },
    });
  }, [pluginInstance.instance_id, trackId, sendMessage]);

  // Filter parameters based on search
  const filteredParameters = Object.entries(pluginInstance.parameters).filter(([name, param]) => {
    if (!parameterSearch) return true;
    const search = parameterSearch.toLowerCase();
    return (
      name.toLowerCase().includes(search) ||
      param.display_name.toLowerCase().includes(search)
    );
  });

  const getStateColor = () => {
    switch (pluginInstance.state) {
      case 'active':
        return pluginInstance.is_bypassed ? 'text-yellow-400' : 'text-green-400';
      case 'loading':
        return 'text-blue-400';
      case 'error':
      case 'crashed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStateIcon = () => {
    switch (pluginInstance.state) {
      case 'active':
        return pluginInstance.is_bypassed ? '⏸' : '▶';
      case 'loading':
        return '⏳';
      case 'error':
      case 'crashed':
        return '⚠';
      default:
        return '⏹';
    }
  };

  const containerClasses = cn(
    'bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg',
    compact ? 'p-2' : 'p-4',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Plugin Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={cn('text-sm', getStateColor())}>
            {getStateIcon()}
          </span>
          <div>
            <div className="font-medium text-daw-text-primary text-sm">
              {pluginInstance.plugin_metadata.name}
            </div>
            {!compact && (
              <div className="text-xs text-daw-text-secondary">
                {pluginInstance.plugin_metadata.manufacturer}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {!compact && (
            <Button
              onClick={() => setShowParameters(!showParameters)}
              variant="secondary"
              size="sm"
              className="text-xs px-2 py-1"
            >
              {showParameters ? 'Hide' : 'Show'}
            </Button>
          )}
          <Button
            onClick={handleBypass}
            variant={pluginInstance.is_bypassed ? 'secondary' : 'accent'}
            size="sm"
            className="text-xs px-2 py-1"
          >
            {pluginInstance.is_bypassed ? 'Bypassed' : 'Active'}
          </Button>
          <Button
            onClick={handleRemove}
            variant="danger"
            size="sm"
            className="text-xs px-2 py-1"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      {showPerformanceMetrics && performanceMetrics && (
        <div className="mb-3 p-2 bg-daw-surface-primary rounded border">
          <div className="text-xs font-medium text-daw-text-secondary mb-1">Performance</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-daw-text-tertiary">CPU</div>
              <div className="text-daw-text-primary">
                {(performanceMetrics.avg_cpu_usage * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-daw-text-tertiary">Memory</div>
              <div className="text-daw-text-primary">
                {performanceMetrics.avg_memory_usage.toFixed(1)}MB
              </div>
            </div>
            <div>
              <div className="text-daw-text-tertiary">Latency</div>
              <div className="text-daw-text-primary">
                {pluginInstance.latency_ms.toFixed(1)}ms
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Selection */}
      {pluginInstance.available_presets.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-daw-text-secondary mb-1">
            Preset
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
          >
            <option value="">Select preset...</option>
            {pluginInstance.available_presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Navigation */}
      {!compact && (
        <div className="flex items-center space-x-1 mb-3 border-b border-daw-surface-tertiary">
          <button
            onClick={() => setActiveTab('interface')}
            className={cn(
              'px-2 py-1 text-xs rounded-t',
              activeTab === 'interface'
                ? 'bg-daw-accent-primary text-white'
                : 'text-daw-text-secondary hover:text-daw-text-primary'
            )}
          >
            Interface
          </button>
          {showPresetBrowser && (
            <button
              onClick={() => setActiveTab('presets')}
              className={cn(
                'px-2 py-1 text-xs rounded-t',
                activeTab === 'presets'
                  ? 'bg-daw-accent-primary text-white'
                  : 'text-daw-text-secondary hover:text-daw-text-primary'
              )}
            >
              Presets
            </button>
          )}
          {showStateManager && (
            <button
              onClick={() => setActiveTab('state')}
              className={cn(
                'px-2 py-1 text-xs rounded-t',
                activeTab === 'state'
                  ? 'bg-daw-accent-primary text-white'
                  : 'text-daw-text-secondary hover:text-daw-text-primary'
              )}
            >
              State
            </button>
          )}
          {showPerformanceMetrics && (
            <button
              onClick={() => setActiveTab('performance')}
              className={cn(
                'px-2 py-1 text-xs rounded-t',
                activeTab === 'performance'
                  ? 'bg-daw-accent-primary text-white'
                  : 'text-daw-text-secondary hover:text-daw-text-primary'
              )}
            >
              Performance
            </button>
          )}
        </div>
      )}

      {/* Tab Content */}
      {!compact && (
        <div className="tab-content">
          {activeTab === 'interface' && (
            <PluginInterface
              pluginInstance={pluginInstance}
              trackId={trackId}
              showNativeUI={showNativeUI}
            />
          )}
          
          {activeTab === 'presets' && showPresetBrowser && (
            <PluginPresetBrowser
              pluginInstance={pluginInstance}
              trackId={trackId}
              onPresetLoad={(preset) => {
                setSelectedPreset(preset.name);
                handlePresetChange(preset.name);
              }}
            />
          )}
          
          {activeTab === 'state' && showStateManager && (
            <PluginStateManager
              pluginInstance={pluginInstance}
              trackId={trackId}
              showABComparison={true}
            />
          )}
          
          {activeTab === 'performance' && showPerformanceMetrics && (
            <PluginPerformanceMonitor
              pluginInstance={pluginInstance}
              showDetails={true}
            />
          )}
        </div>
      )}

      {/* Compact Parameters View */}
      {compact && showParameters && (
        <div className="space-y-3">
          {/* Parameter Search */}
          {filteredParameters.length > 6 && (
            <input
              type="text"
              placeholder="Search parameters..."
              value={parameterSearch}
              onChange={(e) => setParameterSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
            />
          )}

          {/* Parameter Controls */}
          <div className={cn(
            'grid gap-3',
            compact ? 'grid-cols-2' : 'grid-cols-3 md:grid-cols-4'
          )}>
            {filteredParameters.slice(0, compact ? 4 : 12).map(([paramId, parameter]) => (
              <ParameterControl
                key={paramId}
                parameter={parameter}
                onChange={(value) => handleParameterChange(paramId, value)}
                compact={compact}
              />
            ))}
          </div>

          {/* Show more parameters button */}
          {filteredParameters.length > (compact ? 4 : 12) && (
            <Button
              onClick={() => setShowParameters(false)}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              Show All Parameters ({filteredParameters.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

interface ParameterControlProps {
  parameter: PluginParameter;
  onChange: (value: number) => void;
  compact?: boolean;
}

const ParameterControl: React.FC<ParameterControlProps> = ({
  parameter,
  onChange,
  compact = false,
}) => {
  const [localValue, setLocalValue] = useState(parameter.value);

  // Update local value when parameter changes
  useEffect(() => {
    setLocalValue(parameter.value);
  }, [parameter.value]);

  const handleChange = useCallback((value: number) => {
    setLocalValue(value);
    onChange(value);
  }, [onChange]);

  const formatValue = (value: number) => {
    if (parameter.unit) {
      return `${value.toFixed(2)}${parameter.unit}`;
    }
    return value.toFixed(2);
  };

  // Determine if we should use a knob or slider
  const useKnob = !compact && (parameter.max_value - parameter.min_value) <= 10;

  if (useKnob) {
    return (
      <div className="flex flex-col items-center">
        <Knob
          value={localValue}
          min={parameter.min_value}
          max={parameter.max_value}
          step={0.01}
          onChange={handleChange}
          label={parameter.display_name}
          unit={parameter.unit}
          disabled={!parameter.is_automatable}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-daw-text-secondary truncate">
          {parameter.display_name}
        </label>
        <span className="text-xs text-daw-text-tertiary font-mono">
          {formatValue(localValue)}
        </span>
      </div>
      <Slider
        value={localValue}
        min={parameter.min_value}
        max={parameter.max_value}
        step={0.01}
        onChange={handleChange}
        orientation="horizontal"
        disabled={!parameter.is_automatable}
      />
    </div>
  );
};

export default PluginControl;